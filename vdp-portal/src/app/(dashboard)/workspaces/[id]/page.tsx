import { WorkspaceDetailClient } from '@/components/product/workspaces/workspace-detail-client'

export default async function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <WorkspaceDetailClient workspaceId={id} />
}
