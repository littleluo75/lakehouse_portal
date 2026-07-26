import { requireAuth } from '@/lib/require-auth'
import { SparkJobsClient } from '@/components/modules/spark/spark-jobs-client'
import { DeferredRoutePlaceholder } from '@/components/ba-draft/deferred-route-placeholder'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function JobsPage() {
  if (isBaDraftMode()) {
    return <DeferredRoutePlaceholder title="Spark Jobs" />
  }
  await requireAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  return <SparkJobsClient />
}
