import { requireAuth } from '@/lib/require-auth'
import { SqlEditorClient } from '@/components/modules/sql/sql-editor-client'
import { BaQueryClient } from '@/components/product/query/ba-query-client'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function QueryPage() {
  if (isBaDraftMode()) {
    return (
      <div>
        <h1 className="text-xl font-semibold mb-4">SQL Editor</h1>
        <BaQueryClient />
      </div>
    )
  }
  await requireAuth(['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'])
  return <SqlEditorClient />
}
