import { Cliente } from '@/types'

const BUBBLE_BASE = 'https://nexiplay.com/api/1.1'

export type ClienteComCidade = Cliente & { cidade: string }

async function bubbleFetch(path: string, token: string) {
  const res = await fetch(`${BUBBLE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  })
  if (!res.ok) return null
  return res.json()
}

async function buscarStatusMap(
  clienteIds: string[],
  token: string
): Promise<Record<string, string>> {
  if (clienteIds.length === 0) return {}

  const constraints = JSON.stringify([
    { key: 'cliente', constraint_type: 'in', value: clienteIds },
  ])
  const params = new URLSearchParams({
    constraints,
    sort_field: 'Created Date',
    descending: 'true',
    limit: '100',
  })

  const json = await bubbleFetch(`/obj/Tarefa_Missao?${params}`, token)
  const tarefas: Record<string, unknown>[] = json?.response?.results ?? []

  const map: Record<string, string> = {}
  for (const t of tarefas) {
    const clienteId = t['cliente'] as string | undefined
    if (clienteId && !map[clienteId]) {
      map[clienteId] = String(t['Titulo'] ?? '')
    }
  }
  return map
}

export async function buscarClientesDoAgente(
  agenteId: string,
  tokenBubble: string
): Promise<ClienteComCidade[]> {
  const constraints = JSON.stringify([
    { key: 'Responsavel', constraint_type: 'equals', value: agenteId },
  ])

  const json = await bubbleFetch(
    `/obj/Cliente?constraints=${encodeURIComponent(constraints)}&limit=100`,
    tokenBubble
  )
  if (!json) return []

  const results: Record<string, unknown>[] = json?.response?.results ?? []
  if (results.length === 0) return []

  const clienteIds = results.map((c) => c._id as string)
  const statusMap = await buscarStatusMap(clienteIds, tokenBubble)

  return results.map((c) => {
    const id = c._id as string
    return {
      id,
      bubble_id: id,
      razao_social: String(c['Razao Social'] ?? c['Nome'] ?? ''),
      cnpj: String(c['CNPJ'] ?? ''),
      uf: String(c['UF_Região'] ?? ''),
      cidade: '',
      consumo_estimado: c['Consumo Estimado'] as number | undefined,
      status_atual: statusMap[id] ?? 'Prospectar cliente',
      responsavel_id: agenteId,
      proximo_follow_up: c['Proximo Follow Up'] as string | undefined,
      concorrente_atual: c['Concorrente'] as string | undefined,
      data_vencimento_contrato: c['Data Vencimento Contrato'] as string | undefined,
    }
  })
}

export async function buscarDadosCnpj(cnpj: string) {
  try {
    const cnpjLimpo = cnpj.replace(/\D/g, '')
    const res = await fetch(
      `https://api.nexiplay.com.br/api/cnpj?cnpj=${cnpjLimpo}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
