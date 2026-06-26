import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('s')
  if (secret !== process.env.DEBUG_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const bubbleId = user?.user_metadata?.bubble_id as string | undefined
  const cookieStore = await cookies()
  const token = cookieStore.get('bubble_token')?.value

  if (!bubbleId || !token) {
    return NextResponse.json({ error: 'not logged in', bubbleId, hasToken: !!token })
  }

  const constraints = JSON.stringify([
    { key: 'Responsavel', constraint_type: 'equals', value: bubbleId },
  ])
  const res = await fetch(
    `https://nexiplay.com/api/1.1/obj/Cliente?constraints=${encodeURIComponent(constraints)}&limit=2`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const json = await res.json()
  const first = json?.response?.results?.[0] ?? {}

  const tarefaRes = await fetch(
    `https://nexiplay.com/api/1.1/obj/Tarefa_Missao?constraints=${encodeURIComponent(JSON.stringify([{ key: 'cliente', constraint_type: 'equals', value: first._id }]))}&sort_field=Created%20Date&descending=true&limit=2`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const tarefaJson = await tarefaRes.json()

  return NextResponse.json({
    clienteKeys: Object.keys(first),
    clienteRaw: first,
    tarefas: tarefaJson?.response?.results ?? [],
  })
}
