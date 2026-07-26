'use client'

import { useQuery } from '@tanstack/react-query'
import { productApi } from '@/lib/product-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState, ErrorState, OperationStatusBadge } from '@/components/ba-draft/status-states'
import type { Operation, Workspace } from '@/lib/ba-draft/fixtures/types'

interface DashboardSummary {
  workspace: Workspace
  counts: {
    connections: number
    connectionsActive: number
    pipelines: number
    pipelinesRunning: number
    accessRequestsPending: number
    operationsFailed: number
    datasetsPublished: number
  }
  recentOperations: Operation[]
}

export function BaDashboardClient() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-dashboard-summary'],
    queryFn: () => productApi.get<DashboardSummary>('/dashboard/summary'),
  })

  if (isLoading) return <LoadingState label="Đang tải tổng quan…" />
  if (error) return <ErrorState message="Không thể tải dữ liệu tổng quan." onRetry={() => refetch()} />
  if (!data) return null

  const tiles = [
    { label: 'Connections', value: data.counts.connections, sub: `${data.counts.connectionsActive} active` },
    { label: 'Pipelines', value: data.counts.pipelines, sub: `${data.counts.pipelinesRunning} running` },
    { label: 'Access requests pending', value: data.counts.accessRequestsPending, sub: 'chờ phê duyệt' },
    { label: 'Datasets published', value: data.counts.datasetsPublished, sub: 'đã publish' },
    { label: 'Operations failed', value: data.counts.operationsFailed, sub: 'cần xử lý' },
    { label: 'Storage used', value: `${data.workspace.quota.storageGbUsed}/${data.workspace.quota.storageGbLimit} GB`, sub: 'quota' },
  ]

  return (
    <div className="space-y-6" data-testid="ba-dashboard">
      <div>
        <h1 className="text-2xl font-semibold">{data.workspace.name}</h1>
        <p className="text-sm text-slate-500">Tenant: {data.workspace.tenant}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{tile.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{tile.value}</div>
              <div className="text-xs text-slate-400">{tile.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentOperations.length === 0 && <p className="text-sm text-slate-400">Chưa có operation nào.</p>}
          {data.recentOperations.map((op) => (
            <div key={op.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
              <div>
                <span className="font-medium">{op.kind}</span>
                {op.message && <span className="text-slate-400 ml-2">{op.message}</span>}
              </div>
              <OperationStatusBadge status={op.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
