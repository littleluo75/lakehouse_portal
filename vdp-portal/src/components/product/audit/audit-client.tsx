'use client'

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { AuditEvent } from '@/lib/ba-draft/fixtures/types'
import { auditExperience } from '@/lib/ba-draft/fixtures/experience'
import { DataToolbar, PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid } from '@/components/product/enterprise-page'

const OUTCOME_VARIANT: Record<AuditEvent['outcome'], 'default' | 'destructive' | 'secondary'> = {
  success: 'default',
  denied: 'secondary',
  error: 'destructive',
}

export function AuditClient() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-audit'],
    queryFn: () => productApi.get<{ items: AuditEvent[] }>('/audit'),
  })

  if (isLoading) return <LoadingState label="Đang tải audit log…" />
  if (error) return <ErrorState message="Không thể tải audit log." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có sự kiện audit nào." />

  return (
    <div className="page-stack"><PageHeader eyebrow="Governance evidence · immutable mock history" title="Audit log" description="Ai đã thực hiện hành động gì, trên tài nguyên nào, trong workspace nào, qua dịch vụ nào và với kết quả/correlation nào." /><SummaryGrid><SummaryCard label="Events · 24h" value={items.length} detail="Deterministic mock clock" tone="info"/><SummaryCard label="Successful" value={items.filter((item)=>item.outcome==='success').length} detail="No unexpected errors" tone="success"/><SummaryCard label="Denied / error" value={items.filter((item)=>item.outcome!=='success').length} detail="Policy decisions retained" tone="warning"/><SummaryCard label="Source services" value="2" detail="Workspace · Access Policy" tone="info"/></SummaryGrid><DataToolbar placeholder="Tìm actor, action, target hoặc correlation ID" filters={<><button>Workspace</button><button>Outcome</button><button>Source service</button><button>Date range</button></>} /><SectionCard title="Audit evidence" description={`${items.length} events · newest first`}><div className="enterprise-table-wrap"><Table data-testid="audit-table">
      <TableHeader>
        <TableRow>
          <TableHead>Thời gian</TableHead>
          <TableHead>Actor</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Workspace</TableHead><TableHead>Decision / result</TableHead><TableHead>Source service</TableHead><TableHead>Correlation ID</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((e) => { const meta = auditExperience[e.id as keyof typeof auditExperience] ?? { actorName:e.actor,targetName:e.target,service:'ProductApi mock',correlation:`corr-ba-${e.id}`,decision:e.outcome }; return (
          <TableRow key={e.id} data-testid={`audit-row-${e.id}`}>
            <TableCell className="text-xs">{new Date(e.at).toLocaleString('vi-VN')}</TableCell>
            <TableCell><strong>{meta.actorName}</strong><div className="font-mono text-[9px] text-slate-400">{e.actor}</div></TableCell><TableCell className="font-mono text-xs">{e.action}</TableCell><TableCell><strong>{meta.targetName}</strong><div className="font-mono text-[9px] text-slate-400">{e.target}</div></TableCell><TableCell>{e.workspaceId ?? 'Platform scope'}</TableCell><TableCell>
              <Badge variant={OUTCOME_VARIANT[e.outcome]}>{e.outcome}</Badge>
              <div className="mt-1 text-[10px] text-slate-500">{meta.decision}</div></TableCell><TableCell><StatusChip tone="info">{meta.service}</StatusChip></TableCell><TableCell className="font-mono text-[10px] text-cyan-700">{meta.correlation}</TableCell>
          </TableRow>
        )})}
      </TableBody>
    </Table></div></SectionCard><div className="muted-note">Audit records are fictional, deterministic and local. Export remains constrained and no production identifiers are represented.</div></div>
  )
}
