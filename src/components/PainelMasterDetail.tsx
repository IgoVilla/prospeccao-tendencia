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
  agenteId,
}: {
  clientes: ClienteComCidade[]
  atividadesPorCliente: Record<string, Atividade[]>
  agenteId: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filtroUf, setFiltroUf] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroAtrasado, setFiltroAtrasado] = useState(false)
  const [filtroRenovacao, setFiltroRenovacao] = useState(false)
  const [filtroUltimoStatus, setFiltroUltimoStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [atividadesLocais, setAtividadesLocais] = useState<Record<string, Atividade[]>>(atividadesPorCliente)
  const [metaLocais, setMetaLocais] = useState<Record<string, { concorrente_atual?: string; data_vencimento_contrato?: string; proximo_follow_up?: string }>>({})

  const clientesComMeta = useMemo(() =>
    clientes.map((c) => ({ ...c, ...(metaLocais[c.bubble_id] ?? {}) })),
    [clientes, metaLocais]
  )

  const ultimoStatusMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [id, ativs] of Object.entries(atividadesLocais)) {
      if (ativs.length > 0) map[id] = ativs[0].status
    }
    return map
  }, [atividadesLocais])

  const clientesFiltrados = useMemo(() => {
    return clientesComMeta.filter((c) => {
      if (filtroUf && c.uf !== filtroUf) return false
      if (filtroStatus && c.status_atual !== filtroStatus) return false
      if (filtroUltimoStatus && ultimoStatusMap[c.bubble_id] !== filtroUltimoStatus) return false
      if (filtroAtrasado && !followUpAtrasado(c.proximo_follow_up)) return false
      if (filtroRenovacao && !renovacaoProxima(c.data_vencimento_contrato)) return false
      if (busca) {
        const q = busca.toLowerCase()
        if (!c.razao_social.toLowerCase().includes(q) && !c.uf.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [clientesComMeta, filtroUf, filtroStatus, filtroUltimoStatus, ultimoStatusMap, filtroAtrasado, filtroRenovacao, busca])

  const selectedCliente = selectedId ? clientesComMeta.find((c) => c.bubble_id === selectedId) ?? null : null
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
    if (atividade.follow_up_data !== undefined) {
      setMetaLocais((prev) => ({
        ...prev,
        [clienteId]: { ...(prev[clienteId] ?? {}), proximo_follow_up: atividade.follow_up_data },
      }))
    }
  }

  function adicionarAtividadeEmMassa(ids: string[], atividades: Atividade[]) {
    setAtividadesLocais((prev) => {
      const next = { ...prev }
      for (const a of atividades) {
        next[a.cliente_id] = [a, ...(next[a.cliente_id] ?? [])]
      }
      return next
    })
    setMetaLocais((prev) => {
      const next = { ...prev }
      for (const a of atividades) {
        if (a.follow_up_data !== undefined) {
          next[a.cliente_id] = { ...(next[a.cliente_id] ?? {}), proximo_follow_up: a.follow_up_data }
        }
      }
      return next
    })
  }

  return (
    <div className="flex h-full">
      <ListaClientesLateral
        clientes={clientesFiltrados}
        todosClientes={clientesComMeta}
        selectedId={selectedId}
        onSelect={setSelectedId}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        filtros={{ uf: filtroUf, cidade: '', status: filtroStatus, ultimoStatus: filtroUltimoStatus, atrasado: filtroAtrasado, renovacao: filtroRenovacao }}
        onFiltroChange={(key, value) => {
          if (key === 'uf') setFiltroUf(value as string)
          else if (key === 'status') setFiltroStatus(value as string)
          else if (key === 'ultimoStatus') setFiltroUltimoStatus(value as string)
          else if (key === 'atrasado') setFiltroAtrasado(value as boolean)
          else if (key === 'renovacao') setFiltroRenovacao(value as boolean)
        }}
        busca={busca}
        onBuscaChange={setBusca}
        agenteId={agenteId}
        onAcaoEmMassa={(ids, atividades) => adicionarAtividadeEmMassa(ids, atividades)}
      />

      {selectedCliente ? (
        <div className="flex flex-1 min-w-0">
          <PainelInfoCliente
            key={selectedCliente.bubble_id}
            cliente={selectedCliente}
            dadosCnpj={null}
            agenteId={agenteId}
            temHistorico={atividades.length > 0}
            onNovaAtividade={(a) => adicionarAtividade(selectedCliente.bubble_id, a)}
            onMetaSalva={(concorrente, dataVencimento) =>
              setMetaLocais((prev) => ({
                ...prev,
                [selectedCliente.bubble_id]: { concorrente_atual: concorrente, data_vencimento_contrato: dataVencimento },
              }))
            }
          />
          <TimelineCliente
            clienteId={selectedCliente.bubble_id}
            atividades={atividades}
            agenteId={agenteId}
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
