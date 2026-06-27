import { requireAuth } from '@/lib/require-auth'
import { CatalogClient } from '@/components/modules/openmetadata/catalog-client'

export default async function CatalogPage() {
  await requireAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  return <CatalogClient />
}
