import { Cliente } from '@/types'

const BUBBLE_BASE = 'https://nexiplay.com/api/1.1'

export type ClienteComCidade = Cliente & { cidade: string }

export async function buscarClientesDoAgente(
  agenteId: string,
  tokenBubble: string
): Promise<ClienteComCidade[]> {
  const constraints = JSON.stringify([
    { key: 'Responsavel', constraint_type: 'equals', value: agenteId },
  ])

  const res = await fetch(
    `${BUBBLE_BASE}/obj/Cliente?constraints=${encodeURIComponent(constraints)}`,
    {
      headers: { Authorization: `Bearer ${tokenBubble}` },
      next: { revalidate: 0 },
    }
  )

  if (!res.ok) return []

  const json = await res.json()
  const results: Record<string, unknown>[] = json?.response?.results ?? []

  return results.map((c) => ({
    id: c._id as string,
    bubble_id: c._id as string,
    razao_social: String(c['Razao Social'] ?? c['Nome'] ?? ''),
    cnpj: String(c['CNPJ'] ?? ''),
    uf: String(c['UF'] ?? ''),
    cidade: String(c['Cidade'] ?? ''),
    consumo_estimado: c['Consumo Estimado'] as number | undefined,
    status_atual: String(c['Status'] ?? 'Novo'),
    responsavel_id: agenteId,
    proximo_follow_up: c['Proximo Follow Up'] as string | undefined,
    concorrente_atual: c['Concorrente'] as string | undefined,
    data_vencimento_contrato: c['Data Vencimento Contrato'] as string | undefined,
  }))
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
