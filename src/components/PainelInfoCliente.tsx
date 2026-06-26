'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, MapPin, Phone, FileText, Users, AlertTriangle } from 'lucide-react'
import { Cliente, DadosCnpj, Atividade } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { renovacaoProxima, formatarDataCurta } from '@/lib/utils'
import ModalRegistrarContato from './ModalRegistrarContato'

export default function PainelInfoCliente({
  cliente,
  dadosCnpj,
  agenteId,
  temHistorico,
  onNovaAtividade,
  onMetaSalva,
}: {
  cliente: Cliente & { cidade?: string }
  dadosCnpj: DadosCnpj | null
  agenteId: string
  temHistorico: boolean
  onNovaAtividade?: (atividade: Atividade) => void
  onMetaSalva?: (concorrente: string, dataVencimento: string) => void
}) {
  const [modalAberto, setModalAberto] = useState(false)
  const [concorrente, setConcorrente] = useState(cliente.concorrente_atual ?? '')
  const [dataVencimento, setDataVencimento] = useState(cliente.data_vencimento_contrato ?? '')
  const [salvando, setSalvando] = useState(false)
  const [salvoOk, setSalvoOk] = useState(false)
  const [erroMeta, setErroMeta] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMount = useRef(true)

  const dataContrato = dataVencimento || cliente.data_vencimento_contrato
  const alertaRenovacao = renovacaoProxima(dataContrato)

  async function salvarMeta(c = concorrente, d = dataVencimento) {
    setSalvando(true)
    setSalvoOk(false)
    setErroMeta('')
    const supabase = createClient()
    const { error } = await supabase.from('pt_clientes_meta').upsert({
      cliente_id: cliente.bubble_id,
      agente_id: agenteId,
      concorrente_atual: c || null,
      data_vencimento_contrato: d || null,
      updated_at: new Date().toISOString(),
    })
    setSalvando(false)
    if (error) {
      setErroMeta('Erro ao salvar: ' + error.message)
    } else {
      setSalvoOk(true)
      setTimeout(() => setSalvoOk(false), 2000)
      onMetaSalva?.(c, d)
    }
  }

  useEffect(() => {
    if (isMount.current) { isMount.current = false; return }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => salvarMeta(concorrente, dataVencimento), 800)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [concorrente, dataVencimento])

  return (
    <>
      <aside
        className="w-72 shrink-0 flex flex-col gap-4 p-5 overflow-y-auto h-full"
        style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {/* Alerta de renovação */}
        {alertaRenovacao && (
          <div
            className="rounded-xl p-3 flex items-start gap-2"
            style={{ background: '#2d1515', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <AlertTriangle size={14} style={{ color: 'var(--danger)', marginTop: 1, flexShrink: 0 }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>Renovação próxima</p>
              <p className="text-xs mt-0.5" style={{ color: '#fca5a5' }}>
                Contrato vence em {formatarDataCurta(dataContrato!)}
              </p>
            </div>
          </div>
        )}

        {/* Nome */}
        <div>
          <h2 className="text-base font-bold leading-tight" style={{ color: 'var(--text)' }}>
            {cliente.razao_social}
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {cliente.cnpj}
          </p>
        </div>

        {/* Dados da Nexi */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Dados da Nexi
          </p>
          <div className="flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text)' }}>
            <span className="flex items-center gap-2">
              <MapPin size={13} style={{ color: 'var(--text-muted)' }} />
              {cliente.cidade ? `${cliente.cidade} · ${cliente.uf}` : cliente.uf}
            </span>
            {cliente.consumo_estimado && (
              <span className="flex items-center gap-2">
                <FileText size={13} style={{ color: 'var(--text-muted)' }} />
                {cliente.consumo_estimado.toLocaleString('pt-BR')} kWh/mês
              </span>
            )}
            <span
              className="inline-flex w-fit text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {cliente.status_atual}
            </span>
          </div>
        </div>

        {/* Dados da Receita Federal */}
        {dadosCnpj && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Receita Federal
            </p>
            <div className="flex flex-col gap-1.5 text-xs" style={{ color: 'var(--text)' }}>
              {dadosCnpj.nome_fantasia && (
                <span className="flex items-center gap-2">
                  <Building2 size={12} style={{ color: 'var(--text-muted)' }} />
                  {dadosCnpj.nome_fantasia}
                </span>
              )}
              {dadosCnpj.logradouro && (
                <span className="flex items-center gap-2">
                  <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
                  {dadosCnpj.logradouro}, {dadosCnpj.numero} — {dadosCnpj.bairro}, {dadosCnpj.municipio}/{dadosCnpj.uf}
                </span>
              )}
              {dadosCnpj.telefone_1 && (
                <span className="flex items-center gap-2">
                  <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                  {dadosCnpj.telefone_1}
                </span>
              )}
              {dadosCnpj.cnae_principal && (
                <span className="flex items-center gap-2">
                  <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                  CNAE {dadosCnpj.cnae_principal}
                </span>
              )}
              {dadosCnpj.socios?.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <span className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <Users size={12} />
                    Sócios
                  </span>
                  {dadosCnpj.socios.map((s, i) => (
                    <span key={i} className="pl-5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {s.nome} — {s.qualificacao}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Concorrente / Vencimento */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Concorrência
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Concorrente atual</label>
              <input
                value={concorrente}
                onChange={(e) => setConcorrente(e.target.value)}
                placeholder="Ex: CPFL, EDP, Celpa..."
                className="px-3 py-2 rounded-lg text-sm w-full"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Vencimento do contrato</label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm w-full"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
            {salvando && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Salvando...</p>}
            {salvoOk && <p className="text-xs" style={{ color: 'var(--accent)' }}>Salvo ✓</p>}
            {erroMeta && <p className="text-xs" style={{ color: 'var(--danger)' }}>{erroMeta}</p>}
          </div>
        </div>

        {/* Botão registrar — só aparece quando já tem histórico (sem histórico a Timeline já tem o CTA) */}
        {temHistorico && (
          <button
            onClick={() => setModalAberto(true)}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 mt-auto"
            style={{ background: 'var(--accent)', color: '#15161b' }}
          >
            Registrar Contato
          </button>
        )}
      </aside>

      {modalAberto && (
        <ModalRegistrarContato
          clienteId={cliente.bubble_id}
          agenteId={agenteId}
          onFechar={() => setModalAberto(false)}
          onNovaAtividade={onNovaAtividade}
        />
      )}
    </>
  )
}
