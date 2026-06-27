import { requireAuth } from '@/lib/require-auth'
import { SparkJobsClient } from '@/components/modules/spark/spark-jobs-client'

export default async function JobsPage() {
  await requireAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  return <SparkJobsClient />
}
