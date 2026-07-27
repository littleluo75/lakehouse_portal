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
      <div data-catalog-id={id}><BaCatalogClient catalogId={id} /></div>
    )
  }
  await requireAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  return <TableDetailView id={id} />
}
