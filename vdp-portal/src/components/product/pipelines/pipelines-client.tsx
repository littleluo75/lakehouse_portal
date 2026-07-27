'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { Pipeline } from '@/lib/ba-draft/fixtures/types'
import { Button } from '@/components/ui/button'
import { DataToolbar, PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid } from '@/components/product/enterprise-page'
import { pipelineExperience } from '@/lib/ba-draft/fixtures/experience'

const STATUS_VARIANT: Record<Pipeline['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  idle: 'secondary',
  running: 'outline',
  succeeded: 'default',
  failed: 'destructive',
}

export function PipelinesClient() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-pipelines'],
    queryFn: () => productApi.get<{ items: Pipeline[] }>('/pipelines'),
  })

  if (isLoading) return <LoadingState label="Đang tải pipelines…" />
  if (error) return <ErrorState message="Không thể tải danh sách pipelines." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có pipeline nào." />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Data flows · orchestration" title="Pipelines" description="Theo dõi schedule, nguồn–đích, phiên bản, chất lượng, freshness và SLA của các luồng dữ liệu trong workspace." actions={<Button>Create pipeline</Button>} />
      <SummaryGrid><SummaryCard label="Active pipelines" value={items.length} detail="2 scheduled · 0 paused" tone="success"/><SummaryCard label="Running now" value={items.filter((item) => item.status === 'running').length} detail="1.2M records observed" tone="info"/><SummaryCard label="7-day success" value="96.8%" detail="58/60 runs succeeded" tone="success"/><SummaryCard label="SLA at risk" value="1" detail="IoT freshness lag" tone="warning"/></SummaryGrid>
      <DataToolbar placeholder="Tìm pipeline, source, destination hoặc owner" filters={<><button>Status</button><button>Schedule</button><button>SLA</button></>} />
      <SectionCard title="Pipeline inventory" description={`${items.length} flows · active workspace`}><div className="enterprise-table-wrap">
      <Table data-testid="pipelines-table">
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Schedule / trigger</TableHead>
          <TableHead>Source → destination</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Latest run</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Quality</TableHead>
          <TableHead>Freshness / SLA</TableHead>
          <TableHead>Version</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((p) => { const meta = pipelineExperience[p.id]; return (
          <TableRow key={p.id} data-testid={`pipeline-row-${p.id}`}>
            <TableCell>
              <Link href={`/pipelines/${p.id}`} className="font-medium text-cyan-700 hover:underline">
                {p.name}
              </Link>
              <div className="mt-1 flex items-center gap-2"><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge><span className="font-mono text-[9px] text-slate-400">{p.id} · {p.nodes.length} nodes</span></div>
            </TableCell>
            <TableCell>{meta.schedule}</TableCell><TableCell><strong>{meta.source}</strong><div className="text-[10px] text-slate-400">→ {meta.destination}</div></TableCell><TableCell>{meta.owner}</TableCell><TableCell>{meta.latest}</TableCell><TableCell>{meta.duration}</TableCell><TableCell><StatusChip tone="success">{meta.quality}</StatusChip></TableCell><TableCell><StatusChip tone={meta.freshness.includes('risk') ? 'warning' : 'success'}>{meta.freshness}</StatusChip></TableCell><TableCell>{meta.version}</TableCell>
          </TableRow>
        )})}
      </TableBody>
    </Table></div></SectionCard>
    </div>
  )
}
