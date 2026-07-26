import { requireAuth } from '@/lib/require-auth'
import { StorageClient } from '@/components/modules/storage/storage-client'
import { DeferredRoutePlaceholder } from '@/components/ba-draft/deferred-route-placeholder'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function StoragePage() {
  if (isBaDraftMode()) {
    return <DeferredRoutePlaceholder title="Storage (MinIO)" />
  }
  await requireAuth(['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'])
  return <StorageClient />
}
