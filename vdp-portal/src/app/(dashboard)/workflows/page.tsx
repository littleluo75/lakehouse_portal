import { requireAuth } from '@/lib/require-auth'
import { WorkflowsClient } from '@/components/modules/airflow/workflows-client'
import { DeferredRoutePlaceholder } from '@/components/ba-draft/deferred-route-placeholder'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function WorkflowsPage() {
  if (isBaDraftMode()) {
    return <DeferredRoutePlaceholder title="Workflows (Airflow)" note="Xem /pipelines cho luồng BA Draft tương đương." />
  }
  await requireAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  return <WorkflowsClient />
}
