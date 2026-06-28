import { requireAuth } from '@/lib/require-auth'
import { StorageClient } from '@/components/modules/storage/storage-client'

export default async function StoragePage() {
  await requireAuth(['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'])
  return <StorageClient />
}
