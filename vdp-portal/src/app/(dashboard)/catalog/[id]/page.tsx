import { requireAuth } from '@/lib/require-auth'
import { TableDetailView } from '@/components/modules/openmetadata/table-detail-view'

export default async function CatalogTablePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  const { id } = await params
  return <TableDetailView id={id} />
}
