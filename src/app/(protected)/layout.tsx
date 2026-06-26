import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const agente = {
    nome: (user.user_metadata?.nome as string | undefined) ?? user.email ?? 'Agente',
    email: user.email ?? '',
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      <Sidebar agente={agente} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
