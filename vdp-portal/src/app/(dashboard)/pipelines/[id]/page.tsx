import { PipelineDetailClient } from '@/components/product/pipelines/pipeline-detail-client'

export default async function PipelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PipelineDetailClient pipelineId={id} />
}
