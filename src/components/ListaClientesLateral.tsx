'use client'

import { useState, useMemo } from 'react'
import { Search, Clock, AlertTriangle, CheckSquare2, Square, Users, X } from 'lucide-react'
import { Atividade } from '@/types'
import { ClienteComCidade } from '@/lib/mock-clientes'
import { followUpAtrasado, renovacaoProxima, diasAtraso, formatarDataCurta } from '@/lib/utils'
import ModalAcaoEmMassa from './ModalAcaoEmMassa'

const STATUS_CORES: Record<string, { bg: string; cor: string }> = {
  'Novo':        { bg: '#1e293b', cor: '#94a3b8' },
  'Em contato':  { bg: '#1e2d3b', cor: '#60a5fa' },
  'Proposta':    { bg: '#2d2a1e', cor: '#fbbf24' },
  'Convertido':  { bg: '#0d2620', cor: '#09bc8a' },
  'Perdido':     { bg: '#2d1515', cor: '#ef4444' },
}

export default function ListaClientesLateral({
  clientes,
  todosClientes,
  selectedId,
  onSelect,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  filtros,
  onFiltroChange,
  busca,
  onBuscaChange,
  onAcaoEmMassa,
}: {
  clientes: ClienteComCidade[]
  todosClientes: ClienteComCidade[]
  selectedId: string | null
  onSelect: (id: string) => void
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: (ids: string[]) => void
  filtros: { uf: string; cidade: string; status: string; atrasado: boolean; renovacao: boolean }
  onFiltroChange: (key: string, value: string | boolean) => void
  busca: string
  onBuscaChange: (v: string) => void
  onAcaoEmMassa: (ids: string[], base: Omit<Atividade, 'id' | 'created_at' | 'cliente_id'>) => void
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [modalMassaAberto, setModalMassaAberto] = useState(false)

  const ufsDisponiveis = useMemo(
    () => [...new Set(todosClientes.map((c) => c.uf))].sort(),
    [todosClientes]
  )

  const cidadesDisponiveis = useMemo(() => {
    const fonte = filtros.uf ? todosClientes.filter((c) => c.uf === filtros.uf) : todosClientes
    return [...new Set(fonte.map((c) => c.cidade))].filter(Boolean).sort()
  }, [todosClientes, filtros.uf])

  const idsFiltrados = clientes.map((c) => c.bubble_id)
  const todosSelecionados = idsFiltrados.length > 0 && idsFiltrados.every((id) => selectedIds.has(id))
  const algumSelecionado = selectedIds.size > 0

  const clientesSelecionadosNomes = [...selectedIds]
    .map((id) => todosClientes.find((c) => c.bubble_id === id)?.razao_social ?? '')
    .filter(Boolean)

  const hayFiltrosAtivos = filtros.uf || filtros.cidade || filtros.status || filtros.atrasado || filtros.renovacao || busca

  function limparFiltros() {
    onFiltroChange('uf', '')
    onFiltroChange('cidade', '')
    onFiltroChange('status', '')
    onFiltroChange('atrasado', false)
    onFiltroChange('renovacao', false)
    onBuscaChange('')
  }

  return (
    <aside
      className="flex flex-col h-full shrink-0"
      style={{ width: 304, borderRight: '1px solid var(--border)', background: 'var(--surface)' }}
    >
      {/* Header */}
      <div className="p-3 flex flex-col gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
        {/* Busca */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar cliente ou cidade..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text)' }}
          />
          {busca && (
            <button onClick={() => onBuscaChange('')}>
              <X size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
        </div>

        {/* Filtros linha 1: UF + Cidade */}
        <div className="flex gap-2">
          <select
            value={filtros.uf}
            onChange={(e) => onFiltroChange('uf', e.target.value)}
            className="flex-1 px-2 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Todas UFs</option>
            {ufsDisponiveis.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>

          <select
            value={filtros.cidade}
            onChange={(e) => onFiltroChange('cidade', e.target.value)}
            className="flex-1 px-2 py-1.5 rounded-lg text-xs"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <option value="">Todas cidades</option>
            {cidadesDisponiveis.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Filtros linha 2: Status */}
        <select
          value={filtros.status}
          onChange={(e) => onFiltroChange('status', e.target.value)}
          className="w-full px-2 py-1.5 rounded-lg text-xs"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <option value="">Todos os status</option>
          <option value="Novo">Novo</option>
          <option value="Em contato">Em contato</option>
          <option value="Proposta">Proposta</option>
          <option value="Convertido">Convertido</option>
          <option value="Perdido">Perdido</option>
        </select>

        {/* Quick filters */}
        <div className="flex gap-2">
          <button
            onClick={() => onFiltroChange('atrasado', !filtros.atrasado)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filtros.atrasado ? '#422006' : 'var(--surface-2)',
              color: filtros.atrasado ? 'var(--warning)' : 'var(--text-muted)',
              border: `1px solid ${filtros.atrasado ? 'var(--warning)' : 'var(--border)'}`,
            }}
          >
            <Clock size={11} />
            Atrasados
          </button>
          <button
            onClick={() => onFiltroChange('renovacao', !filtros.renovacao)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filtros.renovacao ? '#2d1515' : 'var(--surface-2)',
              color: filtros.renovacao ? 'var(--danger)' : 'var(--text-muted)',
              border: `1px solid ${filtros.renovacao ? 'var(--danger)' : 'var(--border)'}`,
            }}
          >
            <AlertTriangle size={11} />
            Renovação
          </button>
        </div>

        {/* Contagem + limpar + select all */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSelectAll(idsFiltrados)}
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              {todosSelecionados ? (
                <CheckSquare2 size={13} style={{ color: 'var(--accent)' }} />
              ) : (
                <Square size={13} />
              )}
            </button>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {clientes.length} cliente{clientes.length !== 1 ? 's' : ''}
            </span>
          </div>
          {hayFiltrosAtivos && (
            <button
              onClick={limparFiltros}
              className="text-xs transition-opacity hover:opacity-80"
              style={{ color: 'var(--accent)' }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Users size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Nenhum cliente encontrado
            </p>
          </div>
        ) : (
          clientes.map((cliente) => {
            const atrasado = followUpAtrasado(cliente.proximo_follow_up)
            const renovacao = renovacaoProxima(cliente.data_vencimento_contrato)
            const isSelected = selectedId === cliente.bubble_id
            const isChecked = selectedIds.has(cliente.bubble_id)
            const showCheckbox = hoveredId === cliente.bubble_id || isChecked || selectedIds.size > 0
            const statusCor = STATUS_CORES[cliente.status_atual] ?? STATUS_CORES['Novo']

            return (
              <div
                key={cliente.bubble_id}
                onMouseEnter={() => setHoveredId(cliente.bubble_id)}
                onMouseLeave={() => setHoveredId(null)}
                className="rounded-xl p-3 flex gap-2 cursor-pointer transition-all"
                style={{
                  background: isSelected ? 'rgba(9,188,138,0.08)' : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(9,188,138,0.3)'
                    : atrasado
                    ? '1px solid rgba(251,191,36,0.25)'
                    : '1px solid transparent',
                }}
                onClick={() => onSelect(cliente.bubble_id)}
              >
                {/* Checkbox */}
                <button
                  className="shrink-0 mt-0.5 transition-opacity"
                  style={{ opacity: showCheckbox ? 1 : 0 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleSelect(cliente.bubble_id)
                  }}
                >
                  {isChecked ? (
                    <CheckSquare2 size={15} style={{ color: 'var(--accent)' }} />
                  ) : (
                    <Square size={15} style={{ color: 'var(--text-muted)' }} />
                  )}
                </button>

                {/* Conteúdo */}
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  {/* Nome */}
                  <span
                    className="text-sm font-semibold leading-tight"
                    style={{ color: isSelected ? 'var(--accent)' : 'var(--text)' }}
                  >
                    {cliente.razao_social}
                  </span>

                  {/* Cidade + badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {cliente.cidade} · {cliente.uf}
                    </span>
                    {atrasado && (
                      <span
                        className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{ background: '#422006', color: 'var(--warning)' }}
                      >
                        <Clock size={9} />
                        {diasAtraso(cliente.proximo_follow_up)}d
                      </span>
                    )}
                    {renovacao && (
                      <span
                        className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{ background: '#2d1515', color: 'var(--danger)' }}
                      >
                        <AlertTriangle size={9} />
                        Renovação
                      </span>
                    )}
                  </div>

                  {/* Consumo */}
                  {cliente.consumo_estimado && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(cliente.consumo_estimado / 1000).toFixed(0)} MWh/mês
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bulk action bar */}
      {algumSelecionado && (
        <div
          className="p-3 flex flex-col gap-2"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {selectedIds.size} cliente{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setModalMassaAberto(true)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#15161b' }}
            >
              Registrar atividade
            </button>
            <button
              onClick={() => onToggleSelectAll([...selectedIds])}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {modalMassaAberto && (
        <ModalAcaoEmMassa
          idsClientes={[...selectedIds]}
          clientes={todosClientes}
          onSalvar={(base) => {
            onAcaoEmMassa([...selectedIds], base)
            setModalMassaAberto(false)
          }}
          onFechar={() => setModalMassaAberto(false)}
        />
      )}
    </aside>
  )
}
