'use client'

import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { AlertTriangle, Clock, Phone, Mail, Users, FileText, XCircle } from 'lucide-react'
import { Cliente } from '@/types'
import { followUpAtrasado, renovacaoProxima, formatarData, diasAtraso } from '@/lib/utils'

const ICONES_TIPO: Record<string, React.ReactNode> = {
  Ligacao: <Phone size={12} />,
  Email: <Mail size={12} />,
  Reuniao: <Users size={12} />,
  Proposta: <FileText size={12} />,
  Declinio: <XCircle size={12} />,
}

const STATUS_LABELS: Record<string, string> = {
  Atendeu: 'Atendeu',
  'Nao atendeu': 'Não atendeu',
  Agendou: 'Agendou retorno',
  Recusou: 'Recusou',
}

export default function ListaClientes({
  clientes,
  ufs,
  filtroUfAtual,
  filtroStatusAtual,
  filtroAtrasadoAtual,
}: {
  clientes: Cliente[]
  ufs: string[]
  filtroUfAtual: string
  filtroStatusAtual: string
  filtroAtrasadoAtual: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setFiltro(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de filtros */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl flex-wrap"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <select
          value={filtroUfAtual}
          onChange={(e) => setFiltro('uf', e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          <option value="">Todas as UFs</option>
          {ufs.map((uf) => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>

        <select
          value={filtroStatusAtual}
          onChange={(e) => setFiltro('status', e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          <option value="">Todos os status</option>
          <option value="Novo">Novo</option>
          <option value="Em contato">Em contato</option>
          <option value="Proposta">Proposta</option>
          <option value="Convertido">Convertido</option>
          <option value="Perdido">Perdido</option>
        </select>

        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={filtroAtrasadoAtual}
            onChange={(e) => setFiltro('atrasado', e.target.checked ? '1' : '')}
            className="rounded"
          />
          Follow-up atrasado
        </label>

        {(filtroUfAtual || filtroStatusAtual || filtroAtrasadoAtual) && (
          <button
            onClick={() => router.push(pathname)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ color: 'var(--accent)', background: 'var(--surface-2)' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      {clientes.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum cliente encontrado com os filtros aplicados.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {clientes.map((cliente) => {
            const atrasado = followUpAtrasado(cliente.proximo_follow_up)
            const renovacao = renovacaoProxima(cliente.data_vencimento_contrato)

            return (
              <Link
                key={cliente.id}
                href={`/clientes/${cliente.bubble_id}`}
                className="block rounded-xl p-4 transition-all hover:opacity-90"
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${atrasado ? 'var(--warning)' : 'var(--border)'}`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    {/* Linha 1 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                        {cliente.razao_social}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                        style={{
                          background: 'var(--surface-2)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {cliente.status_atual}
                      </span>
                    </div>

                    {/* Linha 2 */}
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{cliente.uf}</span>
                      {cliente.consumo_estimado && (
                        <>
                          <span>·</span>
                          <span>{cliente.consumo_estimado.toLocaleString('pt-BR')} kWh/mês</span>
                        </>
                      )}
                      {cliente.concorrente_atual && (
                        <>
                          <span>·</span>
                          <span>{cliente.concorrente_atual}</span>
                        </>
                      )}
                    </div>

                    {/* Linha 3 — último contato */}
                    {cliente.ultimo_contato && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1">
                          {ICONES_TIPO[cliente.ultimo_contato.tipo]}
                          {cliente.ultimo_contato.tipo}
                        </span>
                        <span>·</span>
                        {cliente.ultimo_contato.status && (
                          <span>{STATUS_LABELS[cliente.ultimo_contato.status] ?? cliente.ultimo_contato.status}</span>
                        )}
                        <span>·</span>
                        <span>{formatarData(cliente.ultimo_contato.created_at)}</span>
                      </div>
                    )}
                  </div>

                  {/* Alertas */}
                  <div className="flex flex-col gap-1.5 shrink-0 items-end">
                    {atrasado && (
                      <div
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                        style={{ background: '#422006', color: 'var(--warning)' }}
                      >
                        <Clock size={11} />
                        {diasAtraso(cliente.proximo_follow_up)}d atrasado
                      </div>
                    )}
                    {renovacao && (
                      <div
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                        style={{ background: '#2d1515', color: 'var(--danger)' }}
                      >
                        <AlertTriangle size={11} />
                        Renovação próxima
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
