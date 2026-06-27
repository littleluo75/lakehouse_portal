import { requireAuth } from '@/lib/require-auth'
import { WorkflowsClient } from '@/components/modules/airflow/workflows-client'

export default async function WorkflowsPage() {
  await requireAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  return <WorkflowsClient />
}
