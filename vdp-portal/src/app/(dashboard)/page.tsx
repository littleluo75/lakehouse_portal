import { requireAuth } from '@/lib/require-auth'
import { DashboardClient } from '@/components/modules/dashboard/dashboard-client'
import { BaDashboardClient } from '@/components/product/dashboard/ba-dashboard-client'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function DashboardPage() {
  if (isBaDraftMode()) {
    return <BaDashboardClient />
  }
  await requireAuth()
  return <DashboardClient />
}
