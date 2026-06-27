import { requireAuth } from '@/lib/require-auth'
import { AdminClient } from '@/components/modules/admin/admin-client'

export default async function AdminPage() {
  await requireAuth(['SuperAdmin'])
  return <AdminClient />
}
