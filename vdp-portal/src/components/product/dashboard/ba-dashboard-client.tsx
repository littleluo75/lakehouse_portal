'use client'

import { useQuery } from '@tanstack/react-query'
import { productApi } from '@/lib/product-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState, ErrorState, OperationStatusBadge } from '@/components/ba-draft/status-states'
import type { Operation, Workspace } from '@/lib/ba-draft/fixtures/types'
import { AlertTriangle, ArrowRight, Database, Gauge, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Meter, PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid } from '@/components/product/enterprise-page'
import { serviceHealth } from '@/lib/ba-draft/fixtures/experience'

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

  const storagePct = Math.round(data.workspace.quota.storageGbUsed / data.workspace.quota.storageGbLimit * 100)

  return (<>
    <div className="page-stack" data-testid="ba-dashboard">
      <PageHeader eyebrow={`Workspace command center · ${data.workspace.tenant.toUpperCase()}`} title={data.workspace.name} description="Tình trạng tài nguyên, luồng dữ liệu, yêu cầu truy cập và hoạt động vận hành trong một ngữ cảnh đánh giá thống nhất." actions={<Button>Open workspace <ArrowRight /></Button>} />
      <SummaryGrid columns={6}>
        <SummaryCard label="Connections" value={data.counts.connections} detail={`${data.counts.connectionsActive} healthy · 1 stale`} tone="success" icon={<Database />} />
        <SummaryCard label="Pipelines" value={data.counts.pipelines} detail={`${data.counts.pipelinesRunning} running · SLA 96%`} tone="info" />
        <SummaryCard label="Published datasets" value={data.counts.datasetsPublished} detail="1 quality warning" tone="success" />
        <SummaryCard label="Query activity" value="148" detail="24h · 0 write attempts" tone="info" />
        <SummaryCard label="Pending approvals" value={data.counts.accessRequestsPending} detail="Oldest 2h 18m" tone="warning" icon={<ShieldCheck />} />
        <SummaryCard label="Failed operations" value={data.counts.operationsFailed} detail="Requires owner review" tone={data.counts.operationsFailed ? 'danger' : 'success'} icon={<AlertTriangle />} />
      </SummaryGrid>
      <div className="split-grid">
        <SectionCard title="Attention queue" description="Exceptions ranked by business and SLA impact" action={<Button variant="outline" size="sm">View operations</Button>}>
          <div className="divide-y"><div className="flex items-start justify-between gap-4 p-4"><div><strong className="text-sm">Legacy CRM validation is stale</strong><p className="mt-1 text-xs text-slate-500">Connection conn-0003 · last success 36 days ago · owner Integration Alpha</p></div><StatusChip tone="warning">Action needed</StatusChip></div><div className="flex items-start justify-between gap-4 p-4"><div><strong className="text-sm">Dataset quality threshold near breach</strong><p className="mt-1 text-xs text-slate-500">fact_sales_daily · completeness 98.7% · target 99%</p></div><StatusChip tone="warning">Monitor</StatusChip></div><div className="flex items-start justify-between gap-4 p-4"><div><strong className="text-sm">Access decision waiting</strong><p className="mt-1 text-xs text-slate-500">Contributor access · Sales JDBC · policy review required</p></div><StatusChip tone="info">2h 18m</StatusChip></div></div>
        </SectionCard>
        <SectionCard title="Platform & tool health" description="Mock services · observed at 10:30 ICT"><div className="divide-y px-4">{serviceHealth.map((service) => <div className="flex items-center justify-between py-3" key={service.name}><div><strong className="block text-xs">{service.name}</strong><span className="font-mono text-[10px] text-slate-500">{service.latency}</span></div><StatusChip tone={service.tone}>{service.state}</StatusChip></div>)}</div></SectionCard>
      </div>
      <div className="split-grid">
        <SectionCard title="Recent operational activity" description="Deterministic audit-linked events from the current workspace"><div className="divide-y px-4">{data.recentOperations.map((op) => <div key={op.id} className="flex items-center justify-between py-3 text-xs"><div><strong>{op.kind}</strong><div className="mt-1 font-mono text-[10px] text-slate-500">{op.id} · corr-ba-{op.id.slice(-4)} · {op.message ?? 'State reconciled'}</div></div><OperationStatusBadge status={op.status} /></div>)}</div></SectionCard>
        <SectionCard title="Quota & capacity" description="Workspace allocation and forecast" action={<Gauge className="h-4 w-4 text-cyan-700" />}><div className="space-y-5 p-4"><div><div className="mb-2 flex justify-between text-xs"><span>Storage</span><strong>{data.workspace.quota.storageGbUsed} / {data.workspace.quota.storageGbLimit} GB</strong></div><Meter value={storagePct} tone={storagePct > 80 ? 'warning' : 'info'} /><p className="mt-2 text-[10px] text-slate-500">Forecast: 82% in 30 days at current growth</p></div><div><div className="mb-2 flex justify-between text-xs"><span>Connections</span><strong>{data.workspace.quota.connectionsUsed} / {data.workspace.quota.connectionsLimit}</strong></div><Meter value={data.workspace.quota.connectionsUsed / data.workspace.quota.connectionsLimit * 100} tone="success" /></div></div></SectionCard>
      </div>
    </div>
    <div className="hidden">
    <div className="space-y-6" data-testid="legacy-ba-dashboard">
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
    </div></div>
  </>)
}
