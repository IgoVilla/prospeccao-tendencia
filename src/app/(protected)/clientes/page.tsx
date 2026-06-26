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

  const clientes = bubbleId && bubbleToken
    ? await buscarClientesDoAgente(bubbleId, bubbleToken)
    : []

  let atividadesPorCliente: Record<string, Atividade[]> = {}
  let clientesFinais = clientes

  if (clientes.length > 0) {
    const clienteIds = clientes.map((c) => c.id)

    const [{ data: atividades }, { data: metas }] = await Promise.all([
      supabase.from('pt_atividades').select('*').in('cliente_id', clienteIds).order('created_at', { ascending: false }),
      supabase.from('pt_clientes_meta').select('*').in('cliente_id', clienteIds),
    ])

    if (atividades) {
      for (const a of atividades) {
        if (!atividadesPorCliente[a.cliente_id]) atividadesPorCliente[a.cliente_id] = []
        atividadesPorCliente[a.cliente_id].push(a as Atividade)
      }
    }

    if (metas && metas.length > 0) {
      const metaMap = Object.fromEntries(metas.map((m) => [m.cliente_id, m]))
      clientesFinais = clientes.map((c) => {
        const meta = metaMap[c.id]
        if (!meta) return c
        return {
          ...c,
          concorrente_atual: meta.concorrente_atual ?? undefined,
          data_vencimento_contrato: meta.data_vencimento_contrato ?? undefined,
        }
      })
    }
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
