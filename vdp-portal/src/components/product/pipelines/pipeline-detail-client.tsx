'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GitMerge, Play, Sparkles, Filter, Download, Minus, Plus, Maximize2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OperationStatusBadge, LoadingState, ErrorState } from '@/components/ba-draft/status-states'
import { MappingDrawer } from '@/components/product/dag/mapping-drawer'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { Pipeline, PipelineNode, PipelineRun } from '@/lib/ba-draft/fixtures/types'
import { PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid, Tabs } from '@/components/product/enterprise-page'
import { pipelineExperience } from '@/lib/ba-draft/fixtures/experience'

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
  const meta = pipelineExperience[pipeline.id]

  return (
    <div className="space-y-6" data-testid="pipeline-detail">
      <PageHeader eyebrow={`Data flow · ${pipeline.id} · ${meta.version}`} title={pipeline.name} description={`${meta.source} → ${meta.destination} · owner ${meta.owner} · ${meta.schedule}`} actions={<Button data-testid="trigger-pipeline-run" onClick={() => runMutation.mutate('success')} disabled={runMutation.isPending}><Play className="h-3.5 w-3.5" />{runMutation.isPending ? 'Đang chạy…' : 'Run pipeline'}</Button>} />
      <div className="flex items-center gap-2"><StatusChip tone={pipeline.status === 'running' ? 'info' : 'success'}>{pipeline.status}</StatusChip><StatusChip tone="success">SLA on time</StatusChip><StatusChip tone="warning">1 quality warning</StatusChip></div>
      <SummaryGrid columns={5}><SummaryCard label="Latest run" value="Succeeded" detail={meta.latest} tone="success"/><SummaryCard label="Duration" value={meta.duration} detail="P95 5m 02s" tone="info"/><SummaryCard label="Quality" value="98.7%" detail="24/24 critical rules" tone="success"/><SummaryCard label="Freshness" value="4h" detail={meta.freshness} tone="success"/><SummaryCard label="Active version" value={`v${pipeline.revision}`} detail="Published 06/01/2026" tone="info"/></SummaryGrid>
      <Tabs items={['Overview','DAG','Run history','Configuration','Lineage','Quality','Alerts','Audit']} active={1}/>
      <div className="hidden items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{pipeline.name}</h1>
          <p className="text-sm text-slate-500">rev {pipeline.revision} · {pipeline.status}</p>
        </div>
        <Button data-testid="legacy-trigger-pipeline-run" onClick={() => runMutation.mutate('success')} disabled={runMutation.isPending}>
          <Play className="h-3.5 w-3.5 mr-1.5" />
          {runMutation.isPending ? 'Đang chạy…' : 'Run pipeline'}
        </Button>
      </div>

      <SectionCard title="DAG canvas" description="Connected execution graph · click mappable nodes to inspect field configuration" action={<div className="flex gap-1"><Button variant="outline" size="icon-sm"><Minus /></Button><Button variant="outline" size="icon-sm"><Plus /></Button><Button variant="outline" size="icon-sm"><Maximize2 /></Button></div>}>
        <div className="dag-canvas" data-testid="dag-nodes">
          {pipeline.nodes.map((node) => {
            const Icon = NODE_ICON[node.type]
            const mappable = node.type === 'merge' || node.type === 'transform'
            return (
              <Card key={node.id} className={`dag-node-card node-${node.type} ${node.id.includes('merge') ? 'selected' : ''}`} data-testid={`dag-node-${node.id}`}>
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-slate-500" />
                    {node.label}
                  </div>
                  <div className="text-xs text-slate-400">id: {node.id}</div>
                  <div className="text-xs text-slate-400">nguồn: {node.sourceCount}</div>
                  <StatusChip tone={node.type === 'quality' ? 'warning' : 'success'}>{node.type === 'quality' ? 'warning · 1 rule' : 'succeeded'}</StatusChip>
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
        </div><div className="dag-canvas-footer"><span>4 nodes · 3 connections · validation passed with 1 warning</span><div><button>Mini map</button><button><RotateCcw /> Retry from selected node</button></div></div>
      </SectionCard>

      <SectionCard title="Run history" description="Desired and observed execution evidence linked to operations and audit">
        <div className="space-y-2" data-testid="pipeline-runs">
          {(runsQuery.data?.items ?? []).map((run) => (
            <div key={run.id} className="flex items-center justify-between border-b px-4 py-3 text-xs last:border-0">
              <span><strong className="font-mono">{run.id}</strong><span className="ml-3 text-slate-500">Scheduled · {new Date(run.startedAt).toLocaleString('vi-VN')} · {meta.duration}</span>{run.retryOfRunId && <span className="text-xs text-slate-400"> (retry of {run.retryOfRunId})</span>}</span>
              <span className="flex items-center gap-3"><span className="text-slate-500">24/24 quality · corr-ba-{run.id.slice(-4)}</span><OperationStatusBadge status={run.status} /></span>
            </div>
          ))}
        </div>
      </SectionCard>

      <MappingDrawer pipelineId={pipelineId} nodeId={mappingNodeId} onOpenChange={(open) => !open && setMappingNodeId(null)} />
    </div>
  )
}
