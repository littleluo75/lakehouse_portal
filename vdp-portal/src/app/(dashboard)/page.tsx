import { requireAuth } from '@/lib/require-auth'
import { DashboardClient } from '@/components/modules/dashboard/dashboard-client'

export default async function DashboardPage() {
  await requireAuth()
  return <DashboardClient />
}
