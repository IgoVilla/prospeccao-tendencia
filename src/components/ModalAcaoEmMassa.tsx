'use client'

import { useState } from 'react'
import { X, Users } from 'lucide-react'
import { Atividade } from '@/types'
import { ClienteComCidade } from '@/lib/nexi'
import { proximoFollowUp } from '@/lib/utils'

const TIPOS = ['Ligacao', 'Email', 'Reuniao', 'Proposta', 'Declinio'] as const
const STATUS = ['Atendeu', 'Nao atendeu', 'Agendou', 'Recusou'] as const

const TIPO_LABELS: Record<string, string> = {
  Ligacao: 'Ligação', Email: 'E-mail', Reuniao: 'Reunião', Proposta: 'Proposta', Declinio: 'Declínio',
}
const STATUS_LABELS: Record<string, string> = {
  Atendeu: 'Atendeu', 'Nao atendeu': 'Não atendeu', Agendou: 'Agendou retorno', Recusou: 'Recusou',
}

export default function ModalAcaoEmMassa({
  idsClientes,
  clientes,
  agenteId,
  onSalvar,
  onFechar,
}: {
  idsClientes: string[]
  clientes: ClienteComCidade[]
  agenteId: string
  onSalvar: (base: Omit<Atividade, 'id' | 'created_at' | 'cliente_id'>) => void
  onFechar: () => void
}) {
  const [tipo, setTipo] = useState<string>('Ligacao')
  const [status, setStatus] = useState<string>('Atendeu')
  const [comentario, setComentario] = useState('')
  const [followUp, setFollowUp] = useState(proximoFollowUp())

  const nomes = idsClientes
    .map((id) => clientes.find((c) => c.bubble_id === id)?.razao_social ?? id)
    .slice(0, 3)
  const extras = idsClientes.length - 3

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    onSalvar({
      agente_id: agenteId,
      tipo: tipo as Atividade['tipo'],
      status: status as Atividade['status'],
      comentario: comentario || undefined,
      follow_up_data: followUp || undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--text)' }}>
              Ação em massa
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Registrar para {idsClientes.length} cliente{idsClientes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Lista de clientes afetados */}
        <div
          className="rounded-xl p-3 flex flex-col gap-1.5"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Users size={12} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Clientes afetados</span>
          </div>
          {nomes.map((nome, i) => (
            <span key={i} className="text-xs" style={{ color: 'var(--text)' }}>• {nome}</span>
          ))}
          {extras > 0 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>e mais {extras}...</span>
          )}
        </div>

        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tipo de contato</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                required
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                className="px-3 py-2 rounded-lg text-sm"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Comentário</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Observação sobre o contato em massa..."
              rows={3}
              className="px-3 py-2 rounded-lg text-sm resize-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Próximo follow-up</label>
            <input
              type="date"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onFechar}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-80"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#15161b' }}
            >
              Registrar para {idsClientes.length}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
