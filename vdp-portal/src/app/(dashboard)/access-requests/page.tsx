import { AccessRequestsClient } from '@/components/product/access-requests/access-requests-client'
import { getBaDraftIdentity } from '@/lib/ba-draft/session'

export default async function AccessRequestsPage() {
  const { persona } = await getBaDraftIdentity()
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Access requests</h1>
      <AccessRequestsClient personaRole={persona.role} />
    </div>
  )
}
