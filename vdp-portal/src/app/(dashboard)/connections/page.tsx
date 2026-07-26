import { ConnectionsClient } from '@/components/product/connections/connections-client'
import { getBaDraftIdentity } from '@/lib/ba-draft/session'

export default async function ConnectionsPage() {
  const { persona } = await getBaDraftIdentity()
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Connections</h1>
      <ConnectionsClient personaRole={persona.role} />
    </div>
  )
}
