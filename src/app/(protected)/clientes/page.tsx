import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { buscarClientesDoAgente } from '@/lib/nexi'
import { Atividade } from '@/types'
import PainelMasterDetail from '@/components/PainelMasterDetail'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const bubbleId = user?.user_metadata?.bubble_id as string | undefined
  const cookieStore = await cookies()
  const bubbleToken = cookieStore.get('bubble_token')?.value

  const { clientes, comentariosBubble } = bubbleId && bubbleToken
    ? await buscarClientesDoAgente(bubbleId, bubbleToken)
    : { clientes: [], comentariosBubble: {} }

  let atividadesPorCliente: Record<string, Atividade[]> = {}
  let clientesFinais = clientes

  if (clientes.length > 0) {
    const clienteIds = clientes.map((c) => c.id)

    const [{ data: atividades }, { data: metas }, { data: enriquecimento }] = await Promise.all([
      supabase.from('pt_atividades').select('*').in('cliente_id', clienteIds).order('created_at', { ascending: false }),
      supabase.from('pt_clientes_meta').select('*').in('cliente_id', clienteIds),
      supabase.from('pt_clientes_enriquecimento').select('*').in('bubble_id', clienteIds),
    ])

    if (atividades) {
      for (const a of atividades) {
        if (!atividadesPorCliente[a.cliente_id]) atividadesPorCliente[a.cliente_id] = []
        atividadesPorCliente[a.cliente_id].push(a as Atividade)
      }
    }

    // Mesclar comentários do Bubble (ComentarioNexi) e reordenar por data
    for (const [clienteId, comentarios] of Object.entries(comentariosBubble)) {
      const existentes = atividadesPorCliente[clienteId] ?? []
      atividadesPorCliente[clienteId] = [...existentes, ...comentarios].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }

    const metaMap = Object.fromEntries((metas ?? []).map((m) => [m.cliente_id, m]))
    const enriqMap = Object.fromEntries((enriquecimento ?? []).map((e: { bubble_id: string; uf: string; cidade: string }) => [e.bubble_id, e]))
    const ultimaAtividadeMap: Record<string, string | undefined> = {}
    for (const a of (atividades ?? [])) {
      if (!ultimaAtividadeMap[a.cliente_id]) {
        ultimaAtividadeMap[a.cliente_id] = a.follow_up_data ?? undefined
      }
    }
    clientesFinais = clientes.map((c) => {
      const meta = metaMap[c.id]
      const enriq = enriqMap[c.id]
      return {
        ...c,
        uf: enriq?.uf || c.uf,
        cidade: enriq?.cidade || c.cidade,
        concorrente_atual: meta?.concorrente_atual ?? undefined,
        data_vencimento_contrato: meta?.data_vencimento_contrato ?? undefined,
        proximo_follow_up: ultimaAtividadeMap[c.id] ?? c.proximo_follow_up,
      }
    })
  }

  return (
    <div className="h-full">
      <PainelMasterDetail
        clientes={clientesFinais}
        atividadesPorCliente={atividadesPorCliente}
        agenteId={bubbleId ?? ''}
      />
    </div>
  )
}
