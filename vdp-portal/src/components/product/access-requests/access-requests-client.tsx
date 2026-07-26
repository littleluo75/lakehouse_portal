'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { AccessRequest, PersonaRole } from '@/lib/ba-draft/fixtures/types'

const APPROVER_ROLES: PersonaRole[] = ['TenantAdmin', 'SuperAdmin']

const STATUS_VARIANT: Record<AccessRequest['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  approved: 'default',
  rejected: 'destructive',
  duplicate: 'secondary',
}

export function AccessRequestsClient({ personaRole }: { personaRole: PersonaRole }) {
  const queryClient = useQueryClient()
  const canDecide = APPROVER_ROLES.includes(personaRole)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-access-requests'],
    queryFn: () => productApi.get<{ items: AccessRequest[] }>('/access-requests'),
  })

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => productApi.post(`/access-requests/${id}/${action}`),
    onSuccess: (_data, variables) => {
      toast.success(variables.action === 'approve' ? 'Đã phê duyệt yêu cầu.' : 'Đã từ chối yêu cầu.')
      queryClient.invalidateQueries({ queryKey: ['ba-access-requests'] })
    },
    onError: (err) => toast.error(err instanceof ProductApiError ? err.message : 'Thao tác thất bại.'),
  })

  if (isLoading) return <LoadingState label="Đang tải access requests…" />
  if (error) return <ErrorState message="Không thể tải danh sách access requests." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có access request nào." />

  return (
    <Table data-testid="access-requests-table">
      <TableHeader>
        <TableRow>
          <TableHead>Resource</TableHead>
          <TableHead>Người yêu cầu</TableHead>
          <TableHead>Entitlement</TableHead>
          <TableHead>Trạng thái</TableHead>
          {canDecide && <TableHead className="text-right">Hành động</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((req) => (
          <TableRow key={req.id} data-testid={`access-request-row-${req.id}`}>
            <TableCell className="font-medium">{req.resource}</TableCell>
            <TableCell>{req.requestedBy}</TableCell>
            <TableCell>{req.entitlement}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[req.status]}>{req.status}</Badge>
              {req.reason && <div className="text-xs text-slate-400 mt-1">{req.reason}</div>}
            </TableCell>
            {canDecide && (
              <TableCell className="text-right space-x-1">
                {req.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      data-testid={`approve-access-request-${req.id}`}
                      onClick={() => decide.mutate({ id: req.id, action: 'approve' })}
                      disabled={decide.isPending}
                    >
                      Duyệt
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      data-testid={`reject-access-request-${req.id}`}
                      onClick={() => decide.mutate({ id: req.id, action: 'reject' })}
                      disabled={decide.isPending}
                    >
                      Từ chối
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">Đã xử lý</span>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
