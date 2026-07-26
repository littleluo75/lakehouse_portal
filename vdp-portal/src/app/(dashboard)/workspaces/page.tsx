import { WorkspacesClient } from '@/components/product/workspaces/workspaces-client'

export default function WorkspacesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Workspaces</h1>
      <WorkspacesClient />
    </div>
  )
}
