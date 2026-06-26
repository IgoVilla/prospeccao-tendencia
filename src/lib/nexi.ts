import { Cliente } from '@/types'

const BUBBLE_API = process.env.BUBBLE_API_URL!

export async function buscarClientesDoAgente(
  agenteId: string,
  tokenBubble: string
): Promise<Cliente[]> {
  const constraints = JSON.stringify([
    { key: 'Responsavel', constraint_type: 'equals', value: agenteId },
  ])

  const res = await fetch(
    `${BUBBLE_API}/obj/Cliente?constraints=${encodeURIComponent(constraints)}`,
    {
      headers: { Authorization: `Bearer ${tokenBubble}` },
      next: { revalidate: 0 },
    }
  )

  if (!res.ok) return []

  const json = await res.json()
  const results = json?.response?.results ?? []

  return results.map((c: Record<string, unknown>) => ({
    id: c._id as string,
    bubble_id: c._id as string,
    razao_social: (c['Razao Social'] as string) ?? '',
    cnpj: (c['CNPJ'] as string) ?? '',
    uf: (c['UF'] as string) ?? '',
    consumo_estimado: c['Consumo Estimado'] as number | undefined,
    status_atual: (c['Status'] as string) ?? 'Novo',
    responsavel_id: agenteId,
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
