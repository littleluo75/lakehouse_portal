import { AccessRequestsClient } from '@/components/product/access-requests/access-requests-client'
import { getBaDraftIdentity } from '@/lib/ba-draft/session'

export default async function AccessRequestsPage() {
  const { persona } = await getBaDraftIdentity()
  return <AccessRequestsClient personaRole={persona.role} />
}
