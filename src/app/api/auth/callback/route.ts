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
      const detail = encodeURIComponent(tokenRes.status + ':' + tokenText.slice(0, 300))
      return NextResponse.redirect(`${APP_URL}/?erro=token_invalido&detail=${detail}`)
    }

    let tokenData: Record<string, unknown> = {}
    try { tokenData = JSON.parse(tokenText) } catch { /* not json */ }

    access_token = (tokenData.access_token ?? tokenData.token ?? '') as string
    bubble_user_id = (tokenData.uid ?? tokenData.user_id ?? tokenData.userId ?? '') as string

    if (!access_token || !bubble_user_id) {
      const raw = encodeURIComponent(tokenText.slice(0, 400))
      return NextResponse.redirect(`${APP_URL}/?erro=token_invalido&detail=${raw}`)
    }
  } catch (err) {
    return NextResponse.redirect(`${APP_URL}/?erro=conexao_falhou&detail=${encodeURIComponent(String(err))}`)
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
      return NextResponse.redirect(`${APP_URL}/?erro=agente_nao_encontrado&detail=${encodeURIComponent(userRes.status + ':' + userText.slice(0, 300))}`)
    }
    let userData: { response?: Record<string, unknown> } = {}
    try { userData = JSON.parse(userText) } catch { /* not json */ }
    const u = userData?.response ?? {}
    const keys = encodeURIComponent(JSON.stringify(Object.keys(u)).slice(0, 200))
    email = ((u['authentication email'] ?? u['Authentication Email'] ?? u.email ?? u.Email ?? '') as string).toLowerCase().trim()
    nome = (u.Name ?? u.name ?? u['name'] ?? email) as string
    if (!email) {
      return NextResponse.redirect(`${APP_URL}/?erro=agente_nao_encontrado&keys=${keys}`)
    }
  } catch (err) {
    return NextResponse.redirect(`${APP_URL}/?erro=agente_nao_encontrado&detail=${encodeURIComponent(String(err))}`)
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
