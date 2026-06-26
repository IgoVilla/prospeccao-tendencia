import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { buscarDadosCnpj } from '@/lib/nexi'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const clientes: { bubble_id: string; cnpj: string }[] = body.clientes ?? []

  if (clientes.length === 0) return NextResponse.json({ enriquecidos: [] })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const ids = clientes.map((c) => c.bubble_id)

  // Quais ainda não foram enriquecidos
  const { data: existing } = await supabase
    .from('pt_clientes_enriquecimento')
    .select('bubble_id')
    .in('bubble_id', ids)

  const enrichedIds = new Set((existing ?? []).map((e: { bubble_id: string }) => e.bubble_id))
  const paraEnriquecer = clientes.filter((c) => !enrichedIds.has(c.bubble_id) && c.cnpj)

  if (paraEnriquecer.length > 0) {
    const LOTE = 10
    const novos: { bubble_id: string; uf: string; cidade: string; atualizado_em: string }[] = []

    for (let i = 0; i < paraEnriquecer.length; i += LOTE) {
      const lote = paraEnriquecer.slice(i, i + LOTE)
      const respostas = await Promise.all(lote.map((c) => buscarDadosCnpj(c.cnpj)))
      for (let j = 0; j < lote.length; j++) {
        const dados = respostas[j]
        if (dados?.uf) {
          novos.push({
            bubble_id: lote[j].bubble_id,
            uf: dados.uf,
            cidade: dados.municipio ?? '',
            atualizado_em: new Date().toISOString(),
          })
        }
      }
    }

    if (novos.length > 0) {
      await supabase
        .from('pt_clientes_enriquecimento')
        .upsert(novos, { onConflict: 'bubble_id' })
    }
  }

  // Retorna tudo que existe no Supabase para esses clientes
  const { data: todos } = await supabase
    .from('pt_clientes_enriquecimento')
    .select('*')
    .in('bubble_id', ids)

  return NextResponse.json({ enriquecidos: todos ?? [] })
}
