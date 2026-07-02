import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { requireAuth } from '@/lib/require-auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
