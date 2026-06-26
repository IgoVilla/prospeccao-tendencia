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

function extrairString(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>
    return String(o['Display'] ?? o['text'] ?? o['label'] ?? '')
  }
  return String(val)
}

async function buscarStatusDoCliente(clienteId: string, token: string): Promise<string> {
  const constraints = JSON.stringify([
    { key: 'cliente', constraint_type: 'equals', value: clienteId },
  ])
  const params = new URLSearchParams({
    constraints,
    sort_field: 'Created Date',
    descending: 'true',
    limit: '1',
  })
  const json = await bubbleFetch(`/obj/Tarefa_Missao?${params}`, token)
  const results: Record<string, unknown>[] = json?.response?.results ?? []
  return String(results[0]?.['Titulo'] ?? 'Prospectar cliente')
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

  const statusList = await Promise.all(
    results.map((c) => buscarStatusDoCliente(c._id as string, tokenBubble))
  )

  const clientesMapeados: ClienteComCidade[] = results.map((c, i) => ({
    id: c._id as string,
    bubble_id: c._id as string,
    razao_social: String(c['Razao Social'] ?? c['Nome'] ?? ''),
    cnpj: String(c['CNPJ'] ?? ''),
    uf: extrairString(c['UF_Região']),
    cidade: '',
    consumo_estimado: c['Consumo Estimado'] as number | undefined,
    status_atual: statusList[i],
    responsavel_id: agenteId,
    proximo_follow_up: c['Proximo Follow Up'] ? String(c['Proximo Follow Up']).slice(0, 10) : undefined,
    concorrente_atual: undefined,
    data_vencimento_contrato: undefined,
  }))

  return enriquecerComCnpj(clientesMapeados)
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

async function enriquecerComCnpj(
  clientes: ClienteComCidade[]
): Promise<ClienteComCidade[]> {
  const semUf = clientes.filter((c) => !c.uf && c.cnpj)
  if (semUf.length === 0) return clientes

  const LOTE = 10
  const resultados = new Map<string, { uf: string; cidade: string }>()

  for (let i = 0; i < semUf.length; i += LOTE) {
    const lote = semUf.slice(i, i + LOTE)
    const respostas = await Promise.all(lote.map((c) => buscarDadosCnpj(c.cnpj)))
    for (let j = 0; j < lote.length; j++) {
      const dados = respostas[j]
      if (dados?.uf) {
        resultados.set(lote[j].bubble_id, {
          uf: dados.uf,
          cidade: dados.municipio ?? '',
        })
      }
    }
  }

  return clientes.map((c) => {
    const enriquecido = resultados.get(c.bubble_id)
    if (!enriquecido) return c
    return { ...c, uf: enriquecido.uf, cidade: enriquecido.cidade }
  })
}
