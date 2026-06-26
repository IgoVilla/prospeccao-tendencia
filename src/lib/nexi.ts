import { Cliente, Atividade } from '@/types'

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

async function buscarDadosTarefa(
  clienteId: string,
  token: string
): Promise<{ status: string; comentarios: Atividade[] }> {
  const constraints = JSON.stringify([
    { key: 'cliente', constraint_type: 'equals', value: clienteId },
  ])
  const params = new URLSearchParams({
    constraints,
    sort_field: 'Created Date',
    descending: 'true',
  })
  const json = await bubbleFetch(`/obj/Tarefa_Missao?${params}`, token)
  const results: Record<string, unknown>[] = json?.response?.results ?? []

  const status = String(results[0]?.['Titulo'] ?? 'Prospectar cliente')

  // Coleta todos os IDs de comentários de todas as tarefas
  const allCommentIds: string[] = []
  for (const task of results) {
    const field = task['Comentarios']
    if (!field) continue
    const lista = Array.isArray(field) ? field : [field]
    for (const item of lista) {
      const id = typeof item === 'string' ? item.trim() : ''
      if (id) allCommentIds.push(id)
    }
  }

  if (allCommentIds.length === 0) return { status, comentarios: [] }

  // Busca os objetos Comentario em lote
  const commentConstraints = encodeURIComponent(
    JSON.stringify([{ key: '_id', constraint_type: 'in', value: allCommentIds }])
  )
  const commentJson = await bubbleFetch(
    `/obj/Comentario?constraints=${commentConstraints}&limit=100`,
    token
  )
  const commentResults: Record<string, unknown>[] = commentJson?.response?.results ?? []

  // Busca nomes dos usuários em lote
  const userIds = [...new Set(
    commentResults.map((c) => String(c['UserComment'] ?? '')).filter(Boolean)
  )]
  const userMap: Record<string, string> = {}
  if (userIds.length > 0) {
    const userConstraints = encodeURIComponent(
      JSON.stringify([{ key: '_id', constraint_type: 'in', value: userIds }])
    )
    const userJson = await bubbleFetch(
      `/obj/User?constraints=${userConstraints}&limit=100`,
      token
    )
    const userResults: Record<string, unknown>[] = userJson?.response?.results ?? []
    for (const u of userResults) {
      const nome = String(u['Name'] ?? u['Full Name'] ?? u['Nome'] ?? u['email'] ?? '')
      if (nome) userMap[String(u._id)] = nome
    }
  }

  const comentarios = commentResults
    .map((c, idx) => {
      const texto = String(c['Texto'] ?? '').trim()
      if (!texto) return null
      const userId = String(c['UserComment'] ?? '')
      const autor = userMap[userId] ?? ''
      const displayText = autor ? `${autor}: ${texto}` : texto
      return {
        id: `bubble-${String(c._id)}-${idx}`,
        agente_id: '',
        cliente_id: clienteId,
        tipo: 'ComentarioNexi' as const,
        comentario: displayText,
        created_at: String(c['Created Date'] ?? new Date().toISOString()),
      }
    })
    .filter((c) => c !== null) as Atividade[]

  return { status, comentarios }
}

export async function buscarClientesDoAgente(
  agenteId: string,
  tokenBubble: string
): Promise<{ clientes: ClienteComCidade[]; comentariosBubble: Record<string, Atividade[]> }> {
  const constraints = encodeURIComponent(JSON.stringify([
    { key: 'Responsavel', constraint_type: 'equals', value: agenteId },
  ]))

  const todosResults: Record<string, unknown>[] = []
  let cursor = 0

  while (true) {
    const json = await bubbleFetch(
      `/obj/Cliente?constraints=${constraints}&limit=100&cursor=${cursor}`,
      tokenBubble
    )
    if (!json) break

    const results: Record<string, unknown>[] = json?.response?.results ?? []
    todosResults.push(...results)

    const remaining: number = json?.response?.remaining ?? 0
    if (remaining === 0) break
    cursor += results.length
  }

  if (todosResults.length === 0) return { clientes: [], comentariosBubble: {} }

  const tarefaList = await Promise.all(
    todosResults.map((c) => buscarDadosTarefa(c._id as string, tokenBubble))
  )

  const clientes: ClienteComCidade[] = todosResults.map((c, i) => ({
    id: c._id as string,
    bubble_id: c._id as string,
    razao_social: String(c['Razao Social'] ?? c['Nome'] ?? ''),
    cnpj: String(c['CNPJ'] ?? ''),
    uf: extrairString(c['UF_Região']),
    cidade: '',
    consumo_estimado: c['Consumo Estimado'] as number | undefined,
    status_atual: tarefaList[i].status,
    responsavel_id: agenteId,
    proximo_follow_up: c['Proximo Follow Up'] ? String(c['Proximo Follow Up']).slice(0, 10) : undefined,
    concorrente_atual: undefined,
    data_vencimento_contrato: undefined,
  }))

  const comentariosBubble: Record<string, Atividade[]> = {}
  for (let i = 0; i < todosResults.length; i++) {
    const id = todosResults[i]._id as string
    if (tarefaList[i].comentarios.length > 0) {
      comentariosBubble[id] = tarefaList[i].comentarios
    }
  }

  return { clientes, comentariosBubble }
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

