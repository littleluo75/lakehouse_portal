import { requireAuth } from '@/lib/require-auth'
import { CatalogClient } from '@/components/modules/openmetadata/catalog-client'
import { BaCatalogClient } from '@/components/product/catalog/ba-catalog-client'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function CatalogPage() {
  if (isBaDraftMode()) {
    return <BaCatalogClient />
  }
  await requireAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  return <CatalogClient />
}
