import { requireAuth } from '@/lib/require-auth'
import { CatalogClient } from '@/components/modules/openmetadata/catalog-client'
import { BaCatalogClient } from '@/components/product/catalog/ba-catalog-client'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function CatalogPage() {
  if (isBaDraftMode()) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">Data Catalog</h1>
        <BaCatalogClient />
      </div>
    )
  }
  await requireAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  return <CatalogClient />
}
