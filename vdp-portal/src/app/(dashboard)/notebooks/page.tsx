import { requireAuth } from '@/lib/require-auth'
import { NotebooksClient } from '@/components/modules/jupyterhub/notebooks-client'

export default async function NotebooksPage() {
  await requireAuth(['DE', 'DS', 'Admin', 'SuperAdmin'])
  return <NotebooksClient />
}
