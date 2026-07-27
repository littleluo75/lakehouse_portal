import { ConnectionsClient } from '@/components/product/connections/connections-client'
import { getBaDraftIdentity } from '@/lib/ba-draft/session'

export default async function ConnectionsPage() {
  const { persona } = await getBaDraftIdentity()
  return <ConnectionsClient personaRole={persona.role} />
}
