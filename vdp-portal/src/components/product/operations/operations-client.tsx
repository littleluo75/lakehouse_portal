'use client'

import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OperationStatusBadge, LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { Operation } from '@/lib/ba-draft/fixtures/types'
import { Button } from '@/components/ui/button'
import { DataToolbar, Meter, PageHeader, SectionCard, SummaryCard, SummaryGrid } from '@/components/product/enterprise-page'

/**
 * Product status vs observed status are shown separately: `status` is the
 * operation's own record, `observedStatus`/`observedAt` is a (possibly
 * stale) externally-observed reading — surfacing that gap is part of the
 * "stale observed status" negative scenario.
 */
export function OperationsClient() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-operations'],
    queryFn: () => productApi.get<{ items: Operation[] }>('/operations'),
  })

  if (isLoading) return <LoadingState label="Đang tải operations…" />
  if (error) return <ErrorState message="Không thể tải operations." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có operation nào." />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Operations · reconciliation" title="Operations registry" description="Theo dõi desired state, observed state, progress, retry/cancel eligibility, timestamps, safe errors và correlation references." actions={<Button variant="outline">Refresh observed state</Button>} />
      <SummaryGrid><SummaryCard label="Running" value={items.filter((item) => item.status === 'running').length} detail="1 workflow in progress" tone="info"/><SummaryCard label="Succeeded" value={items.filter((item) => item.status === 'succeeded').length} detail="Last 24 hours" tone="success"/><SummaryCard label="Failed" value={items.filter((item) => item.status === 'failed').length} detail="Retry policy exhausted" tone="danger"/><SummaryCard label="Stale observation" value="1" detail="Observed > 5m ago" tone="warning"/></SummaryGrid>
      <DataToolbar placeholder="Tìm operation ID, resource, workflow hoặc correlation" filters={<><button>Status</button><button>Workflow</button><button>Requester</button></>} />
      <SectionCard title="Operation evidence" description={`${items.length} operations · desired and observed state shown separately`}><div className="enterprise-table-wrap"><Table data-testid="operations-table">
      <TableHeader>
        <TableRow>
          <TableHead>Operation / workflow</TableHead><TableHead>Resource</TableHead><TableHead>Requested by</TableHead><TableHead>Desired state</TableHead><TableHead>Observed state</TableHead><TableHead>Progress</TableHead><TableHead>Timestamps</TableHead><TableHead>Error / correlation</TableHead><TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((op) => (
          <TableRow key={op.id} data-testid={`operation-row-${op.id}`}>
            <TableCell><strong>{op.kind}</strong><div className="font-mono text-[9px] text-slate-400">{op.id} · workflow/mock-{op.kind.replace('.','-')}</div></TableCell><TableCell>{op.kind.includes('connection') ? 'Sales JDBC' : op.kind.includes('pipeline') ? 'IoT Telemetry Rollup' : 'fact_sales_daily'}<div className="font-mono text-[9px] text-slate-400">{op.workspaceId}</div></TableCell><TableCell>Tenant Admin<div className="text-[10px] text-slate-500">BA persona</div></TableCell><TableCell><OperationStatusBadge status={op.status} /><div className="mt-1 text-[10px] text-slate-500">requested state</div></TableCell><TableCell>
              <OperationStatusBadge status={op.observedStatus} />
              <div className="text-xs text-slate-400 mt-1">lúc {new Date(op.observedAt).toLocaleTimeString('vi-VN')}</div>
            </TableCell><TableCell><div className="mb-1 flex justify-between text-[10px]"><span>{op.status === 'running' ? '64%' : '100%'}</span><span>{op.retryCount} retries</span></div><Meter value={op.status === 'running' ? 64 : 100} tone={op.status === 'failed' ? 'danger' : op.status === 'running' ? 'info' : 'success'} /></TableCell><TableCell><span className="block">Start {new Date(op.startedAt).toLocaleString('vi-VN')}</span><span className="text-[10px] text-slate-500">End {op.finishedAt ? new Date(op.finishedAt).toLocaleString('vi-VN') : '—'}</span></TableCell><TableCell className="max-w-48"><span className="text-slate-500">{op.message ?? 'No error'}</span><div className="font-mono text-[9px] text-cyan-700">corr-ba-{op.id.slice(-4)}-2026</div></TableCell><TableCell><Button size="sm" variant="outline" disabled={op.status === 'succeeded'}>{op.status === 'running' ? 'Cancel' : 'Retry'}</Button></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table></div></SectionCard><div className="muted-note">Stale, partial, cancelled and non-retryable states remain visible with an explicit next action; errors never expose stack traces or secrets.</div></div>
  )
}
