import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'

export async function GET() {
  const state = randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const url = new URL('https://nexiplay-84024.bubbleapps.io/oauth/authorize')
  url.searchParams.set('client_id', process.env.BUBBLE_CLIENT_ID!)
  url.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}
