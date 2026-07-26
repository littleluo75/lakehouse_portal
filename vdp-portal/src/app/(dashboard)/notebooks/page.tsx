import { requireAuth } from '@/lib/require-auth'
import { NotebooksClient } from '@/components/modules/jupyterhub/notebooks-client'
import { DeferredRoutePlaceholder } from '@/components/ba-draft/deferred-route-placeholder'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function NotebooksPage() {
  if (isBaDraftMode()) {
    return <DeferredRoutePlaceholder title="Notebooks (JupyterHub)" />
  }
  await requireAuth(['DE', 'DS', 'Admin', 'SuperAdmin'])
  return <NotebooksClient />
}
