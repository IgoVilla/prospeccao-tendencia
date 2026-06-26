import { MOCK_CLIENTES, MOCK_ATIVIDADES } from '@/lib/mock-clientes'
import { notFound } from 'next/navigation'
import TimelineCliente from '@/components/TimelineCliente'
import PainelInfoCliente from '@/components/PainelInfoCliente'

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cliente = MOCK_CLIENTES.find((c) => c.bubble_id === id)
  if (!cliente) notFound()

  const atividades = MOCK_ATIVIDADES[id] ?? []

  return (
    <div className="flex h-full">
      <PainelInfoCliente
        cliente={cliente}
        dadosCnpj={null}
        agenteId="agente-mock"
        temHistorico={atividades.length > 0}
      />
      <TimelineCliente
        clienteId={id}
        atividades={atividades}
        agenteId="agente-mock"
      />
    </div>
  )
}
