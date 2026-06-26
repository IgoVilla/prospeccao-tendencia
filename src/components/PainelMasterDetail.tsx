'use client'

import { useState, useMemo } from 'react'
import { Atividade } from '@/types'
import { ClienteComCidade } from '@/lib/nexi'
import { followUpAtrasado, renovacaoProxima } from '@/lib/utils'
import ListaClientesLateral from './ListaClientesLateral'
import PainelInfoCliente from './PainelInfoCliente'
import TimelineCliente from './TimelineCliente'
import { Users } from 'lucide-react'

export default function PainelMasterDetail({
  clientes,
  atividadesPorCliente,
}: {
  clientes: ClienteComCidade[]
  atividadesPorCliente: Record<string, Atividade[]>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filtroUf, setFiltroUf] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroAtrasado, setFiltroAtrasado] = useState(false)
  const [filtroRenovacao, setFiltroRenovacao] = useState(false)
  const [busca, setBusca] = useState('')
  const [atividadesLocais, setAtividadesLocais] = useState<Record<string, Atividade[]>>(atividadesPorCliente)

  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      if (filtroUf && c.uf !== filtroUf) return false
      if (filtroStatus && c.status_atual !== filtroStatus) return false
      if (filtroAtrasado && !followUpAtrasado(c.proximo_follow_up)) return false
      if (filtroRenovacao && !renovacaoProxima(c.data_vencimento_contrato)) return false
      if (busca) {
        const q = busca.toLowerCase()
        if (!c.razao_social.toLowerCase().includes(q) && !c.uf.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [clientes, filtroUf, filtroStatus, filtroAtrasado, filtroRenovacao, busca])

  const selectedCliente = selectedId ? clientes.find((c) => c.bubble_id === selectedId) ?? null : null
  const atividades = selectedId ? (atividadesLocais[selectedId] ?? []) : []

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll(ids: string[]) {
    const allSelected = ids.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        ids.forEach((id) => next.add(id))
        return next
      })
    }
  }

  function adicionarAtividade(clienteId: string, atividade: Atividade) {
    setAtividadesLocais((prev) => ({
      ...prev,
      [clienteId]: [atividade, ...(prev[clienteId] ?? [])],
    }))
  }

  function adicionarAtividadeEmMassa(ids: string[], base: Omit<Atividade, 'id' | 'created_at' | 'cliente_id'>) {
    const agora = new Date().toISOString()
    setAtividadesLocais((prev) => {
      const next = { ...prev }
      ids.forEach((clienteId) => {
        const nova: Atividade = {
          ...base,
          id: `local-${clienteId}-${Date.now()}`,
          cliente_id: clienteId,
          created_at: agora,
        }
        next[clienteId] = [nova, ...(next[clienteId] ?? [])]
      })
      return next
    })
  }

  return (
    <div className="flex h-full">
      <ListaClientesLateral
        clientes={clientesFiltrados}
        todosClientes={clientes}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        filtros={{ uf: filtroUf, cidade: '', status: filtroStatus, atrasado: filtroAtrasado, renovacao: filtroRenovacao }}
        onFiltroChange={(key, value) => {
          if (key === 'uf') setFiltroUf(value as string)
          else if (key === 'status') setFiltroStatus(value as string)
          else if (key === 'atrasado') setFiltroAtrasado(value as boolean)
          else if (key === 'renovacao') setFiltroRenovacao(value as boolean)
        }}
        busca={busca}
        onBuscaChange={setBusca}
        onAcaoEmMassa={adicionarAtividadeEmMassa}
      />

      {selectedCliente ? (
        <div className="flex flex-1 min-w-0">
          <PainelInfoCliente
            cliente={selectedCliente}
            dadosCnpj={null}
            agenteId="agente-mock"
            onNovaAtividade={(a) => adicionarAtividade(selectedCliente.bubble_id, a)}
          />
          <TimelineCliente
            clienteId={selectedCliente.bubble_id}
            atividades={atividades}
            agenteId="agente-mock"
            onNovaAtividade={(a) => adicionarAtividade(selectedCliente.bubble_id, a)}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(9,188,138,0.08)' }}
          >
            <Users size={24} style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            Selecione um cliente para ver o histórico
          </p>
        </div>
      )}
    </div>
  )
}
