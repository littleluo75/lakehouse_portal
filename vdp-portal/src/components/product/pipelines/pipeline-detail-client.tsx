'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GitMerge, Play, Sparkles, Filter, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OperationStatusBadge, LoadingState, ErrorState } from '@/components/ba-draft/status-states'
import { MappingDrawer } from '@/components/product/dag/mapping-drawer'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { Pipeline, PipelineNode, PipelineRun } from '@/lib/ba-draft/fixtures/types'

const NODE_ICON: Record<PipelineNode['type'], React.ComponentType<{ className?: string }>> = {
  ingest: Download,
  transform: Filter,
  merge: GitMerge,
  quality: Sparkles,
}

/**
 * DEF-0001 correction site: `openMapping` takes an explicit node ID and is
 * the only way the mapping drawer opens — no node click handler ever binds
 * a raw DOM event as the "node identifier".
 */
export function PipelineDetailClient({ pipelineId }: { pipelineId: string }) {
  const queryClient = useQueryClient()
  const [mappingNodeId, setMappingNodeId] = useState<string | null>(null)

  const pipelineQuery = useQuery({
    queryKey: ['ba-pipeline', pipelineId],
    queryFn: () => productApi.get<Pipeline>(`/pipelines/${pipelineId}`),
  })
  const runsQuery = useQuery({
    queryKey: ['ba-pipeline-runs', pipelineId],
    queryFn: () => productApi.get<{ items: PipelineRun[] }>(`/pipelines/${pipelineId}/runs`),
  })

  const runMutation = useMutation({
    mutationFn: (scenario: string) => productApi.post(`/pipelines/${pipelineId}/runs`, { scenario }),
    onSuccess: () => {
      toast.success('Đã kích hoạt pipeline run.')
      queryClient.invalidateQueries({ queryKey: ['ba-pipeline-runs', pipelineId] })
    },
    onError: (err) => toast.error(err instanceof ProductApiError ? err.message : 'Trigger thất bại.'),
  })

  function openMapping(nodeId: string) {
    setMappingNodeId(nodeId)
  }

  if (pipelineQuery.isLoading) return <LoadingState label="Đang tải pipeline…" />
  if (pipelineQuery.error) return <ErrorState message="Không thể tải pipeline." onRetry={() => pipelineQuery.refetch()} />
  const pipeline = pipelineQuery.data
  if (!pipeline) return null

  return (
    <div className="space-y-6" data-testid="pipeline-detail">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{pipeline.name}</h1>
          <p className="text-sm text-slate-500">rev {pipeline.revision} · {pipeline.status}</p>
        </div>
        <Button data-testid="trigger-pipeline-run" onClick={() => runMutation.mutate('success')} disabled={runMutation.isPending}>
          <Play className="h-3.5 w-3.5 mr-1.5" />
          {runMutation.isPending ? 'Đang chạy…' : 'Run pipeline'}
        </Button>
      </div>

      <div>
        <h2 className="text-sm font-medium text-slate-500 mb-2">DAG nodes</h2>
        <div className="flex flex-wrap gap-3" data-testid="dag-nodes">
          {pipeline.nodes.map((node) => {
            const Icon = NODE_ICON[node.type]
            const mappable = node.type === 'merge' || node.type === 'transform'
            return (
              <Card key={node.id} className="w-56" data-testid={`dag-node-${node.id}`}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-slate-500" />
                    {node.label}
                  </div>
                  <div className="text-xs text-slate-400">id: {node.id}</div>
                  <div className="text-xs text-slate-400">nguồn: {node.sourceCount}</div>
                  {mappable && (
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`open-mapping-${node.id}`}
                      onClick={() => openMapping(node.id)}
                    >
                      Mở trình ánh xạ
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-slate-500 mb-2">Run history</h2>
        <div className="space-y-2" data-testid="pipeline-runs">
          {(runsQuery.data?.items ?? []).map((run) => (
            <div key={run.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
              <span>
                {run.id} {run.retryOfRunId && <span className="text-xs text-slate-400">(retry of {run.retryOfRunId})</span>}
              </span>
              <OperationStatusBadge status={run.status} />
            </div>
          ))}
        </div>
      </div>

      <MappingDrawer pipelineId={pipelineId} nodeId={mappingNodeId} onOpenChange={(open) => !open && setMappingNodeId(null)} />
    </div>
  )
}
