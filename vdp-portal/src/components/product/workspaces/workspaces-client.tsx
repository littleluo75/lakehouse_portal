'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { Workspace } from '@/lib/ba-draft/fixtures/types'
import { Button } from '@/components/ui/button'
import { DataToolbar, Meter, PageHeader, StatusChip, SummaryCard, SummaryGrid } from '@/components/product/enterprise-page'
import { workspaceExperience } from '@/lib/ba-draft/fixtures/experience'

type WorkspaceWithCount = Workspace & { memberCount: number }

export function WorkspacesClient() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-workspaces'],
    queryFn: () => productApi.get<{ items: WorkspaceWithCount[] }>('/workspaces'),
  })

  if (isLoading) return <LoadingState label="Đang tải workspaces…" />
  if (error) return <ErrorState message="Không thể tải danh sách workspaces." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có workspace nào." />

  return (<>
    <div className="page-stack">
      <PageHeader eyebrow="Organization & tenancy" title="Workspaces" description="Phạm vi tổ chức, quyền sở hữu, dịch vụ và mức sử dụng tài nguyên của các workspace giả lập." actions={<><Button variant="outline">Request workspace</Button><Button>Create workspace</Button></>} />
      <SummaryGrid><SummaryCard label="Active workspaces" value={items.length} detail="3 organizational units" tone="success"/><SummaryCard label="Services" value="19" detail="17 healthy · 2 degraded" tone="info"/><SummaryCard label="Quota warnings" value="1" detail="Tenant Beta at 99%" tone="warning"/><SummaryCard label="Pending requests" value="3" detail="Across accessible workspaces" tone="warning"/></SummaryGrid>
      <DataToolbar placeholder="Tìm workspace, unit hoặc owner" />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2" data-testid="workspaces-grid">
        {items.map((ws) => { const meta = workspaceExperience[ws.id]; const pct = Math.round(ws.quota.storageGbUsed / ws.quota.storageGbLimit * 100); return <Link key={ws.id} href={`/workspaces/${ws.id}`} data-testid={`workspace-card-${ws.id}`} className="enterprise-card block p-4 transition hover:border-cyan-600 hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><strong className="text-sm">{ws.name}</strong><StatusChip tone={meta.health === 'Healthy' ? 'success' : 'warning'}>{meta.health}</StatusChip></div><p className="mt-1 text-[11px] text-slate-500">{meta.unit} · {meta.owner}</p></div><StatusChip tone="info">{meta.environment} · {meta.type}</StatusChip></div><div className="mt-4 grid grid-cols-4 gap-3 text-xs"><div><span className="block text-[9px] uppercase text-slate-500">Members</span><strong>{ws.memberCount}</strong></div><div><span className="block text-[9px] uppercase text-slate-500">Services</span><strong>{meta.services}</strong></div><div><span className="block text-[9px] uppercase text-slate-500">Pending</span><strong>{meta.pending}</strong></div><div><span className="block text-[9px] uppercase text-slate-500">Lifecycle</span><strong>{meta.lifecycle}</strong></div></div><div className="mt-4"><div className="mb-1.5 flex justify-between text-[10px]"><span>Storage quota</span><strong>{ws.quota.storageGbUsed}/{ws.quota.storageGbLimit} GB · {pct}%</strong></div><Meter value={pct} tone={pct >= 95 ? 'danger' : pct >= 80 ? 'warning' : 'info'} /></div><div className="mt-3 text-[10px] text-slate-500">Last activity {meta.lastActivity} · {ws.quota.connectionsUsed}/{ws.quota.connectionsLimit} connections</div></Link> })}
      </div>
      <div className="muted-note">Mock membership visibility: personas can switch workspace for BA evaluation. This does not represent production authorization enforcement.</div>
    </div>
    <div className="hidden grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="legacy-workspaces-grid">
      {items.map((ws) => {
        const pct = Math.round((ws.quota.storageGbUsed / ws.quota.storageGbLimit) * 100)
        return (
          <Link key={ws.id} href={`/workspaces/${ws.id}`} data-testid={`legacy-workspace-card-${ws.id}`}>
            <Card className="hover:border-slate-400 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">{ws.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-500">
                <div>Tenant: {ws.tenant}</div>
                <div>{ws.memberCount} thành viên</div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Storage</span>
                    <span>
                      {ws.quota.storageGbUsed}/{ws.quota.storageGbLimit} GB
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div></>)
}
