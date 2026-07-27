import { requireAuth } from '@/lib/require-auth'
import { TableDetailView } from '@/components/modules/openmetadata/table-detail-view'
import { BaCatalogClient } from '@/components/product/catalog/ba-catalog-client'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function CatalogTablePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (isBaDraftMode()) {
    return (
      <div data-testid="ba-catalog-detail" data-catalog-id={id}>
        <h1 className="mb-4 text-xl font-semibold">Data Catalog</h1>
        <BaCatalogClient />
      </div>
    )
  }
  await requireAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  return <TableDetailView id={id} />
}
