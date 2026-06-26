'use client'

import { useState } from 'react'
import { Phone, Mail, Users, FileText, XCircle, Calendar, CheckCircle, Clock, XOctagon, CalendarClock } from 'lucide-react'
import { Atividade } from '@/types'
import { formatarData, formatarDataCurta } from '@/lib/utils'
import ModalRegistrarContato from './ModalRegistrarContato'

const TIPO_CONFIG: Record<string, { label: string; icon: React.ReactNode; cor: string }> = {
  Ligacao:  { label: 'Ligação',   icon: <Phone size={14} />,    cor: '#6366f1' },
  Email:    { label: 'E-mail',    icon: <Mail size={14} />,     cor: '#0ea5e9' },
  Reuniao:  { label: 'Reunião',   icon: <Users size={14} />,    cor: '#8b5cf6' },
  Proposta: { label: 'Proposta',  icon: <FileText size={14} />, cor: '#10b981' },
  Declinio: { label: 'Declínio', icon: <XCircle size={14} />,  cor: '#ef4444' },
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; cor: string; bg: string }> = {
  Atendeu:       { label: 'Atendeu',         icon: <CheckCircle size={12} />,   cor: '#22c55e', bg: '#052e16' },
  'Nao atendeu': { label: 'Não atendeu',     icon: <Clock size={12} />,         cor: '#a1a1aa', bg: '#27272a' },
  Agendou:       { label: 'Agendou retorno', icon: <CalendarClock size={12} />, cor: '#f59e0b', bg: '#422006' },
  Recusou:       { label: 'Recusou',         icon: <XOctagon size={12} />,      cor: '#ef4444', bg: '#2d1515' },
}

export default function TimelineCliente({
  clienteId,
  atividades,
  agenteId,
  onNovaAtividade,
}: {
  clienteId: string
  atividades: Atividade[]
  agenteId: string
  onNovaAtividade?: (atividade: Atividade) => void
}) {
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6">
      <div className="flex items-center">
        <h2 className="font-semibold" style={{ color: 'var(--text)' }}>
          Histórico de contatos
        </h2>
      </div>

      {atividades.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center rounded-xl py-16 gap-3"
          style={{ border: '1px dashed var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum contato registrado ainda.
          </p>
          <button
            onClick={() => setModalAberto(true)}
            className="py-2 px-4 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'var(--accent)', color: '#15161b' }}
          >
            Registrar primeiro contato
          </button>
        </div>
      ) : (
        <div className="relative flex flex-col gap-0">
          {atividades.map((atividade, index) => {
            const tipoConfig = TIPO_CONFIG[atividade.tipo] ?? TIPO_CONFIG.Ligacao
            const statusConfig = STATUS_CONFIG[atividade.status] ?? STATUS_CONFIG['Nao atendeu']
            const ehUltimo = index === atividades.length - 1

            return (
              <div key={atividade.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10"
                    style={{ background: tipoConfig.cor, color: 'white' }}
                  >
                    {tipoConfig.icon}
                  </div>
                  {!ehUltimo && (
                    <div className="w-0.5 flex-1 my-1" style={{ background: 'var(--border)' }} />
                  )}
                </div>

                <div className="flex flex-col gap-2 pb-6" style={{ minWidth: 0, flex: 1 }}>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                      style={{ background: tipoConfig.cor + '22', color: tipoConfig.cor }}
                    >
                      {tipoConfig.icon}
                      {tipoConfig.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatarData(atividade.created_at)}
                    </span>
                  </div>

                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit"
                    style={{ background: statusConfig.bg, color: statusConfig.cor }}
                  >
                    {statusConfig.icon}
                    {statusConfig.label}
                  </span>

                  {atividade.comentario && (
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
                    >
                      "{atividade.comentario}"
                    </p>
                  )}

                  {atividade.follow_up_data && (
                    <div
                      className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg w-fit"
                      style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      <Calendar size={12} />
                      Follow-up: {formatarDataCurta(atividade.follow_up_data)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <ModalRegistrarContato
          clienteId={clienteId}
          agenteId={agenteId}
          onFechar={() => setModalAberto(false)}
          onNovaAtividade={onNovaAtividade}
        />
      )}
    </div>
  )
}
