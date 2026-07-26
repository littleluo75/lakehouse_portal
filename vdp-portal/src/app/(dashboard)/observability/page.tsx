import { requireAuth } from '@/lib/require-auth'
import { ObservabilityClient } from '@/components/modules/grafana/observability-client'
import { DeferredRoutePlaceholder } from '@/components/ba-draft/deferred-route-placeholder'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function ObservabilityPage() {
  if (isBaDraftMode()) {
    return <DeferredRoutePlaceholder title="Observability (Grafana)" note="Xem /operations cho trạng thái vận hành BA Draft." />
  }
  await requireAuth(['Op', 'PM', 'Admin', 'SuperAdmin'])
  return <ObservabilityClient />
}
