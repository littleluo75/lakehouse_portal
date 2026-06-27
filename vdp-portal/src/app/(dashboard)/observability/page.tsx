import { requireAuth } from '@/lib/require-auth'
import { ObservabilityClient } from '@/components/modules/grafana/observability-client'

export default async function ObservabilityPage() {
  await requireAuth(['Op', 'PM', 'Admin', 'SuperAdmin'])
  return <ObservabilityClient />
}
