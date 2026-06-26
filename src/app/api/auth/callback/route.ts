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
    const tokenRes = await undiciFetch('https://nexiplay-84024.bubbleapps.io/oauth/access_token', {
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

    if (!tokenRes.ok) {
      console.error('[callback] token exchange falhou:', tokenRes.status, await tokenRes.text())
      return NextResponse.redirect(`${APP_URL}/?erro=token_invalido`)
    }

    const tokenData = await tokenRes.json() as { access_token?: string; user_id?: string }
    access_token = tokenData.access_token ?? ''
    bubble_user_id = tokenData.user_id ?? ''
  } catch (err) {
    console.error('[callback] conexão com Bubble falhou:', err)
    return NextResponse.redirect(`${APP_URL}/?erro=conexao_falhou`)
  }

  if (!access_token || !bubble_user_id) {
    return NextResponse.redirect(`${APP_URL}/?erro=token_invalido`)
  }

  // 2. Buscar dados do usuário no Bubble
  let email = ''
  let nome = ''
  try {
    const userRes = await undiciFetch(
      `https://nexiplay.com/api/1.1/obj/User/${bubble_user_id}`,
      { headers: { Authorization: `Bearer ${access_token}` }, dispatcher: nexiAgent }
    )
    if (userRes.ok) {
      const userData = await userRes.json() as { response?: Record<string, unknown> }
      const u = userData?.response ?? {}
      email = ((u['authentication email'] ?? u.email ?? '') as string).toLowerCase().trim()
      nome = (u.Name ?? u.name ?? email) as string
    }
  } catch (err) {
    console.error('[callback] busca de usuário Bubble falhou:', err)
  }

  if (!email) {
    return NextResponse.redirect(`${APP_URL}/?erro=agente_nao_encontrado`)
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
