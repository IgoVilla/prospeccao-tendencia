'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { proximoFollowUp } from '@/lib/utils'
import { Atividade } from '@/types'

const TIPOS = ['Ligacao', 'Email', 'Reuniao', 'Proposta', 'Declinio'] as const
const STATUS = ['Atendeu', 'Nao atendeu', 'Agendou', 'Recusou'] as const

const TIPO_LABELS: Record<string, string> = {
  Ligacao: 'Ligação', Email: 'E-mail', Reuniao: 'Reunião', Proposta: 'Proposta', Declinio: 'Declínio',
}
const STATUS_LABELS: Record<string, string> = {
  Atendeu: 'Atendeu', 'Nao atendeu': 'Não atendeu', Agendou: 'Agendou retorno', Recusou: 'Recusou',
}

export default function ModalRegistrarContato({
  clienteId,
  agenteId,
  onFechar,
  onNovaAtividade,
}: {
  clienteId: string
  agenteId: string
  onFechar: () => void
  onNovaAtividade?: (atividade: Atividade) => void
}) {
  const [tipo, setTipo] = useState<string>('Ligacao')
  const [status, setStatus] = useState<string>('Atendeu')
  const [comentario, setComentario] = useState('')
  const [followUp, setFollowUp] = useState(proximoFollowUp())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('pt_atividades')
      .insert({
        agente_id: agenteId,
        cliente_id: clienteId,
        tipo,
        status,
        comentario: comentario || null,
        follow_up_data: followUp || null,
      })
      .select()
      .single()

    if (error) {
      setErro('Erro ao salvar. Tente novamente.')
      setSalvando(false)
      return
    }

    if (onNovaAtividade && data) {
      onNovaAtividade(data as Atividade)
    }

    onFechar()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Registrar Contato</h3>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
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
              placeholder="Ex: Falei com Rômulo, responsável financeiro, pede retorno na segunda"
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
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pré-preenchido com +2 dias úteis</p>
          </div>

          {erro && <p className="text-xs" style={{ color: 'var(--danger)' }}>{erro}</p>}

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
              disabled={salvando}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#15161b' }}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
