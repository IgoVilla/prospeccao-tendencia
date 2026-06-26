'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, LayoutDashboard, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/clientes', label: 'Meus Clientes', icon: Users },
  { href: '/painel', label: 'Painel', icon: LayoutDashboard },
]

export default function Sidebar({ agente }: { agente: { nome: string; email: string } }) {
  const pathname = usePathname()
  const router = useRouter()

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside
      className="w-60 flex flex-col h-full shrink-0"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="p-5 flex items-center gap-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#09bc8a" fillOpacity="0.15" />
          <path d="M8 16L14 10L20 16L26 10" stroke="#09bc8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 22L14 16L20 22L26 16" stroke="#09bc8a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.5" />
        </svg>
        <span className="font-semibold text-sm tracking-tight" style={{ color: 'var(--text)' }}>
          Nexi <span style={{ color: 'var(--accent)' }}>Follow-up</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: ativo ? 'var(--surface-2)' : 'transparent',
                color: ativo ? 'var(--accent)' : 'var(--text-muted)',
                borderLeft: ativo ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              <Icon size={15} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer agente */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'rgba(9,188,138,0.15)', color: 'var(--accent)' }}
          >
            {agente.nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
              {agente.nome}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {agente.email}
            </p>
          </div>
        </div>
        <button
          onClick={sair}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </aside>
  )
}
