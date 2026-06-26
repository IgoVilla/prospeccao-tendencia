'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()
  const erro = searchParams.get('erro')

  const erroMsg: Record<string, string> = {
    oauth_invalido: 'Link de autenticação inválido. Tente novamente.',
    token_invalido: 'Erro ao autenticar com a Nexi. Tente novamente.',
    conexao_falhou: 'Não foi possível conectar à Nexi. Verifique sua conexão.',
    agente_nao_encontrado: 'Sua conta não foi encontrada. Fale com o administrador.',
    sessao_falhou: 'Erro ao criar sessão. Tente novamente.',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--background)' }}
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2.5">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#09bc8a" fillOpacity="0.15" />
              <path d="M8 16L14 10L20 16L26 10" stroke="#09bc8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 22L14 16L20 22L26 16" stroke="#09bc8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
            </svg>
            <span className="text-xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
              Nexi <span style={{ color: 'var(--accent)' }}>Follow-up</span>
            </span>
          </div>
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
            Tendência Energia — Prospecção comercial
          </p>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-2xl p-8 flex flex-col gap-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              Bem-vindo de volta
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Use sua conta da Nexi para acessar
            </p>
          </div>

          {erro && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{ color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {erroMsg[erro] ?? 'Erro desconhecido. Tente novamente.'}
            </p>
          )}

          <a
            href="/api/auth/login"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95 glow-brand"
            style={{ background: 'var(--accent)', color: '#15161b' }}
          >
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M8 16L14 10L20 16L26 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 22L14 16L20 22L26 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.6" />
            </svg>
            Entrar com a Nexi
          </a>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>autenticação segura via OAuth</span>
            <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
          </div>
        </div>

        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Ao entrar, você concorda com os termos de uso da plataforma.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
