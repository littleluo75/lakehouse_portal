import { requireAuth } from '@/lib/require-auth'
import { AdminClient } from '@/components/modules/admin/admin-client'
import { DeferredRoutePlaceholder } from '@/components/ba-draft/deferred-route-placeholder'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function AdminPage() {
  if (isBaDraftMode()) {
    return <DeferredRoutePlaceholder title="Quản trị (Keycloak users/roles)" note="Xem /audit cho nhật ký BA Draft." />
  }
  await requireAuth(['SuperAdmin'])
  return <AdminClient />
}
