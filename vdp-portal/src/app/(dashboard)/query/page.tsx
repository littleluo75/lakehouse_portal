import { requireAuth } from '@/lib/require-auth'
import { SqlEditorClient } from '@/components/modules/sql/sql-editor-client'

export default async function QueryPage() {
  await requireAuth(['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'])
  return <SqlEditorClient />
}
