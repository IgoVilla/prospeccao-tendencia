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
  if (clientes.length > 0) {
    const clienteIds = clientes.map((c) => c.id)
    const { data } = await supabase
      .from('pt_atividades')
      .select('*')
      .in('cliente_id', clienteIds)
      .order('created_at', { ascending: false })

    if (data) {
      for (const a of data) {
        if (!atividadesPorCliente[a.cliente_id]) {
          atividadesPorCliente[a.cliente_id] = []
        }
        atividadesPorCliente[a.cliente_id].push(a as Atividade)
      }
    }
  }

  return (
    <div className="h-full">
      <PainelMasterDetail
        clientes={clientes}
        atividadesPorCliente={atividadesPorCliente}
        agenteId={bubbleId ?? ''}
      />
    </div>
  )
}
