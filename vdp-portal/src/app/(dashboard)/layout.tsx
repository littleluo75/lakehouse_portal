import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BaSidebar } from '@/components/ba-draft/ba-sidebar'
import { BaHeader } from '@/components/ba-draft/ba-header'
import { isBaDraftMode } from '@/lib/ba-draft/config'
import { getBaDraftIdentity } from '@/lib/ba-draft/session'
import { requireAuth } from '@/lib/require-auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (isBaDraftMode()) {
    // Mock persona/workspace identity — never touches next-auth/Keycloak.
    const identity = await getBaDraftIdentity()
    return (
      <div className="min-h-screen bg-slate-50">
        <BaSidebar personaRole={identity.persona.role} />
        <BaHeader identity={identity} />
        <main className="ml-60 p-6" style={{ paddingTop: 'calc(4rem + 1.5rem)' }}>
          {children}
        </main>
      </div>
    )
  }

  const session = await requireAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar userRoles={session?.user?.roles ?? []} />
      <Header />
      <main className="ml-60 pt-16 p-6">
        {children}
      </main>
    </div>
  )
}
