'use client'

import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { Membership, Persona, Workspace } from '@/lib/ba-draft/fixtures/types'

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

  return (
    <div className="space-y-6" data-testid="workspace-detail">
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
    </div>
  )
}
