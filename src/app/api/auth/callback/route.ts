import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { fetch as undiciFetch, Agent } from 'undici'

const nexiAgent = new Agent({ connect: { rejectUnauthorized: false } })

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const cookieStore = await cookies()
  const savedState = cookieStore.get('oauth_state')?.value

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/?erro=oauth_invalido`)
  }

  cookieStore.delete('oauth_state')

  // 1. Trocar código por access_token
  let access_token = ''
  let bubble_user_id = ''
  try {
    const tokenRes = await undiciFetch('https://nexiplay.com/api/1.1/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.BUBBLE_CLIENT_ID!,
        client_secret: process.env.BUBBLE_CLIENT_SECRET!,
        redirect_uri: `${APP_URL}/api/auth/callback`,
      }).toString(),
      dispatcher: nexiAgent,
    })

    const tokenText = await tokenRes.text()
    if (!tokenRes.ok) {
      return NextResponse.redirect(`${APP_URL}/?erro=sessao_falhou`)
    }

    let tokenData: Record<string, unknown> = {}
    try { tokenData = JSON.parse(tokenText) } catch { /* not json */ }

    access_token = (tokenData.access_token ?? tokenData.token ?? '') as string
    bubble_user_id = (tokenData.uid ?? tokenData.user_id ?? tokenData.userId ?? '') as string

    if (!access_token || !bubble_user_id) {
      return NextResponse.redirect(`${APP_URL}/?erro=sessao_falhou`)
    }
  } catch {
    return NextResponse.redirect(`${APP_URL}/?erro=sessao_falhou`)
  }

  // 2. Buscar dados do usuário no Bubble
  let email = ''
  let nome = ''
  try {
    const userRes = await undiciFetch(
      `https://nexiplay.com/api/1.1/obj/user/${bubble_user_id}`,
      { headers: { Authorization: `Bearer ${access_token}` }, dispatcher: nexiAgent }
    )
    const userText = await userRes.text()
    if (!userRes.ok || !userText) {
      return NextResponse.redirect(`${APP_URL}/?erro=sessao_falhou`)
    }
    let userData: { response?: Record<string, unknown> } = {}
    try { userData = JSON.parse(userText) } catch { /* not json */ }
    const u = userData?.response ?? {}
    const auth = u.authentication as Record<string, unknown> | undefined
    const authEmail = auth?.email
    let emailFromAuth = ''
    if (typeof authEmail === 'string') {
      emailFromAuth = authEmail
    } else if (authEmail !== null && typeof authEmail === 'object') {
      emailFromAuth = String((authEmail as Record<string, unknown>).email ?? '')
    }
    const rawEmail = (u['authentication email'] ?? u['Authentication Email'] ?? u.email ?? u.Email ?? emailFromAuth ?? '') as string
    email = rawEmail.toLowerCase().trim()
    const nomeFirst = u.Nome ? String(u.Nome) : ''
    const nomeLast = u.Sobrenome ? String(u.Sobrenome) : ''
    nome = (nomeFirst + (nomeLast ? ' ' + nomeLast : '')).trim() || String(u.Name ?? u.name ?? email)
    if (!email) {
      return NextResponse.redirect(`${APP_URL}/?erro=sessao_falhou`)
    }
  } catch {
    return NextResponse.redirect(`${APP_URL}/?erro=sessao_falhou`)
  }

  // 3. Senha derivada determinística para o Supabase
  const derivedPassword = createHmac('sha256', process.env.AUTH_SECRET ?? 'nexi-followup-secret')
    .update(bubble_user_id)
    .digest('hex')

  // 4. Montar response com cookies e criar sessão Supabase
  const response = NextResponse.redirect(`${APP_URL}/clientes`)

  response.cookies.set('bubble_token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Tenta login; se usuário não existir ainda, cria
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: derivedPassword,
  })

  if (signInError) {
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: derivedPassword,
      options: { data: { nome, bubble_id: bubble_user_id } },
    })
    if (signUpError) {
      console.error('[callback] signUp falhou:', signUpError)
      return NextResponse.redirect(`${APP_URL}/?erro=sessao_falhou`)
    }
  } else {
    await supabase.auth.updateUser({ data: { nome, bubble_id: bubble_user_id } })
  }

  return response
}
