import { MOCK_CLIENTES, MOCK_ATIVIDADES } from '@/lib/mock-clientes'
import PainelMasterDetail from '@/components/PainelMasterDetail'

export default function ClientesPage() {
  return (
    <div className="h-full">
      <PainelMasterDetail
        clientes={MOCK_CLIENTES}
        atividadesPorCliente={MOCK_ATIVIDADES}
      />
    </div>
  )
}
