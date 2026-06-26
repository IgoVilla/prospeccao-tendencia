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
    `https://nexiplay.com/api/1.1/obj/Cliente?constraints=${encodeURIComponent(constraints)}&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const json = await res.json()
  const results: Record<string, unknown>[] = json?.response?.results ?? []

  // Collect all unique keys across all clients
  const allKeys = [...new Set(results.flatMap((c) => Object.keys(c)))].sort()

  // Find clients that have any UF-related field
  const clientesComUF = results
    .filter((c) => Object.keys(c).some((k) => k.toLowerCase().includes('uf') || k.toLowerCase().includes('regi')))
    .map((c) => {
      const ufKeys = Object.keys(c).filter((k) => k.toLowerCase().includes('uf') || k.toLowerCase().includes('regi'))
      return { _id: c._id, Nome: c['Nome'], ufFields: Object.fromEntries(ufKeys.map((k) => [k, c[k]])) }
    })

  return NextResponse.json({
    totalClientes: results.length,
    allKeys,
    clientesComUF,
  })
}
