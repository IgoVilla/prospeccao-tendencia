import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { buscarClientesDoAgente } from '@/lib/nexi'
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

  return (
    <div className="h-full">
      <PainelMasterDetail
        clientes={clientes}
        atividadesPorCliente={{}}
      />
    </div>
  )
}
