import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { buscarClientesDoAgente } from '@/lib/nexi'
import { followUpAtrasado, renovacaoProxima, diasAtraso } from '@/lib/utils'
import Link from 'next/link'
import { Users, Clock, Phone, AlertTriangle } from 'lucide-react'
import { isThisWeek } from 'date-fns'

export default async function PainelPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cookieStore = await cookies()
  const bubbleToken = cookieStore.get('bubble_token')?.value ?? ''
  const bubbleId = user?.user_metadata?.bubble_id ?? ''

  const clientes = await buscarClientesDoAgente(bubbleId, bubbleToken)
  const clienteIds = clientes.map((c) => c.bubble_id)

  const [metasResult, atividadesResult] = await Promise.all([
    supabase.from('pt_clientes_meta').select('*').in('cliente_id', clienteIds),
    supabase
      .from('pt_atividades')
      .select('*')
      .in('cliente_id', clienteIds)
      .order('created_at', { ascending: false }),
  ])

  const metas = metasResult.data ?? []
  const atividades = atividadesResult.data ?? []

  const clientesCompletos = clientes.map((c) => {
    const meta = metas.find((m) => m.cliente_id === c.bubble_id)
    const atividade = atividades.find((a) => a.cliente_id === c.bubble_id)
    return {
      ...c,
      concorrente_atual: meta?.concorrente_atual,
      data_vencimento_contrato: meta?.data_vencimento_contrato,
      ultimo_contato: atividade,
      proximo_follow_up: atividade?.follow_up_data,
    }
  })

  const totalClientes = clientesCompletos.length
  const followUpsAtrasados = clientesCompletos.filter((c) => followUpAtrasado(c.proximo_follow_up)).length
  const contatadosEssaSemana = atividades.filter((a) => isThisWeek(new Date(a.created_at), { weekStartsOn: 1 })).length
  const renovacoesProximas = clientesCompletos.filter((c) => renovacaoProxima(c.data_vencimento_contrato)).length

  const urgentes = clientesCompletos
    .filter((c) => followUpAtrasado(c.proximo_follow_up))
    .sort((a, b) => diasAtraso(b.proximo_follow_up) - diasAtraso(a.proximo_follow_up))
    .slice(0, 10)

  const kpis = [
    { label: 'Total de clientes', valor: totalClientes, icon: Users, cor: '#6366f1' },
    { label: 'Follow-ups atrasados', valor: followUpsAtrasados, icon: Clock, cor: '#f59e0b' },
    { label: 'Contatados essa semana', valor: contatadosEssaSemana, icon: Phone, cor: '#22c55e' },
    { label: 'Renovações próximas', valor: renovacoesProximas, icon: AlertTriangle, cor: '#ef4444' },
  ]

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Painel</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, valor, icon: Icon, cor }) => (
          <div
            key={label}
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: cor + '22' }}
            >
              <Icon size={18} style={{ color: cor }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{valor}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Follow-ups urgentes */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <div
          className="px-5 py-4"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <h2 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
            Follow-ups mais urgentes
          </h2>
        </div>

        {urgentes.length === 0 ? (
          <div
            className="px-5 py-8 text-center text-sm"
            style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}
          >
            Nenhum follow-up atrasado. Ótimo trabalho!
          </div>
        ) : (
          <div style={{ background: 'var(--surface)' }}>
            {urgentes.map((cliente, i) => (
              <div
                key={cliente.id}
                className="flex items-center justify-between px-5 py-3 gap-4"
                style={{
                  borderBottom: i < urgentes.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {cliente.razao_social}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {cliente.uf}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ background: '#422006', color: 'var(--warning)' }}
                  >
                    {diasAtraso(cliente.proximo_follow_up)}d atrasado
                  </span>
                  <Link
                    href={`/clientes/${cliente.bubble_id}`}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-80"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                  >
                    Ver cliente
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
