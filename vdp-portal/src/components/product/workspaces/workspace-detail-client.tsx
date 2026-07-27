'use client'

import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { Membership, Persona, Workspace } from '@/lib/ba-draft/fixtures/types'
import { Button } from '@/components/ui/button'
import { Meter, PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid, Tabs } from '@/components/product/enterprise-page'
import { workspaceExperience } from '@/lib/ba-draft/fixtures/experience'

type MembershipWithPersona = Membership & { persona?: Persona }

export function WorkspaceDetailClient({ workspaceId }: { workspaceId: string }) {
  const workspaceQuery = useQuery({
    queryKey: ['ba-workspace', workspaceId],
    queryFn: () => productApi.get<Workspace>(`/workspaces/${workspaceId}`),
  })
  const membersQuery = useQuery({
    queryKey: ['ba-workspace-members', workspaceId],
    queryFn: () => productApi.get<{ items: MembershipWithPersona[] }>(`/workspaces/${workspaceId}/members`),
  })

  if (workspaceQuery.isLoading || membersQuery.isLoading) return <LoadingState label="Đang tải workspace…" />
  if (workspaceQuery.error) return <ErrorState message="Không thể tải workspace." onRetry={() => workspaceQuery.refetch()} />
  if (!workspaceQuery.data) return null

  const members = membersQuery.data?.items ?? []
  const workspace = workspaceQuery.data
  const meta = workspaceExperience[workspace.id]
  const storagePct = Math.round(workspace.quota.storageGbUsed / workspace.quota.storageGbLimit * 100)

  return (<>
    <div className="page-stack" data-testid="workspace-detail">
      <PageHeader eyebrow={`${meta.unit} · ${meta.environment}`} title={workspace.name} description={`${meta.type} workspace owned by ${meta.owner}. Lifecycle, services, memberships and capacity are represented with deterministic mock evidence.`} actions={<><Button variant="outline">Request quota</Button><Button>Manage workspace</Button></>} />
      <div className="flex items-center gap-2"><StatusChip tone="success">{meta.lifecycle}</StatusChip><StatusChip tone={meta.health === 'Healthy' ? 'success' : 'warning'}>{meta.health}</StatusChip><span className="font-mono text-[10px] text-slate-500">{workspace.id} · tenant/{workspace.tenant}</span></div>
      <SummaryGrid><SummaryCard label="Members" value={members.length} detail="1 owner · 1 contributor" tone="info"/><SummaryCard label="Services" value={meta.services} detail="Catalog, query, pipelines" tone="success"/><SummaryCard label="Storage quota" value={`${storagePct}%`} detail={`${workspace.quota.storageGbUsed}/${workspace.quota.storageGbLimit} GB`} tone={storagePct > 80 ? 'warning' : 'info'}/><SummaryCard label="Open operations" value="2" detail="1 running · 1 needs attention" tone="warning"/></SummaryGrid>
      <Tabs items={['Overview','Members','Entitlements','Services & resources','Quota & usage','Operations','Audit']} active={1}/>
      <div className="split-grid">
        <SectionCard title="Members & entitlements" description="Fictional personas available in the active BA scenario">{members.length === 0 ? <EmptyState label="Chưa có thành viên." /> : <Table><TableHeader><TableRow><TableHead>Persona</TableHead><TableHead>Role</TableHead><TableHead>Entitlement</TableHead><TableHead>Unit</TableHead><TableHead>Last activity</TableHead></TableRow></TableHeader><TableBody>{members.map((m) => <TableRow key={m.id}><TableCell><strong>{m.persona?.name ?? m.personaId}</strong><div className="font-mono text-[9px] text-slate-400">{m.personaId}</div></TableCell><TableCell>{m.persona?.role}</TableCell><TableCell><Badge variant="outline">{m.entitlement}</Badge></TableCell><TableCell>{meta.unit}</TableCell><TableCell>{meta.lastActivity}</TableCell></TableRow>)}</TableBody></Table>}</SectionCard>
        <div className="space-y-3"><SectionCard title="Capacity" description="Observed usage · fixed mock timestamp"><div className="space-y-5 p-4"><div><div className="mb-2 flex justify-between text-xs"><span>Storage</span><strong>{storagePct}%</strong></div><Meter value={storagePct} tone={storagePct > 80 ? 'warning' : 'info'}/></div><div><div className="mb-2 flex justify-between text-xs"><span>Compute</span><strong>{meta.computePct}%</strong></div><Meter value={meta.computePct} tone={meta.computePct > 80 ? 'warning' : 'success'}/></div><div><div className="mb-2 flex justify-between text-xs"><span>Connections</span><strong>{workspace.quota.connectionsUsed}/{workspace.quota.connectionsLimit}</strong></div><Meter value={workspace.quota.connectionsUsed/workspace.quota.connectionsLimit*100}/></div></div></SectionCard><div className="muted-note">Membership visibility and entitlement labels are mock-only design evidence; production-grade authorization is not implied.</div></div>
      </div>
    </div>
    <div className="hidden space-y-6" data-testid="legacy-workspace-detail">
      <div>
        <h1 className="text-2xl font-semibold">{workspaceQuery.data.name}</h1>
        <p className="text-sm text-slate-500">Tenant: {workspaceQuery.data.tenant}</p>
      </div>
      <div>
        <h2 className="text-sm font-medium text-slate-500 mb-2">Thành viên & entitlement</h2>
        {members.length === 0 ? (
          <EmptyState label="Chưa có thành viên." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Entitlement</TableHead>
                <TableHead>Tham gia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.persona?.name ?? m.personaId}</TableCell>
                  <TableCell>{m.persona?.role}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.entitlement}</Badge>
                  </TableCell>
                  <TableCell>{new Date(m.addedAt).toLocaleDateString('vi-VN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div></>)
}
