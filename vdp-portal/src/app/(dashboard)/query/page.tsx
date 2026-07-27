import { requireAuth } from '@/lib/require-auth'
import { SqlEditorClient } from '@/components/modules/sql/sql-editor-client'
import { BaQueryClient } from '@/components/product/query/ba-query-client'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function QueryPage() {
  if (isBaDraftMode()) {
    return <BaQueryClient />
  }
  await requireAuth(['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'])
  return <SqlEditorClient />
}
