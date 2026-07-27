'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { AccessRequest, PersonaRole } from '@/lib/ba-draft/fixtures/types'
import { DataToolbar, PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid, Tabs } from '@/components/product/enterprise-page'

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
    <div className="page-stack">
      <PageHeader eyebrow="Governance · policy decisions" title={canDecide ? 'Access approvals' : 'My access requests'} description={canDecide ? 'Đánh giá mục đích, độ nhạy cảm, phạm vi, thời hạn và tác động chính sách trước khi ra quyết định.' : 'Theo dõi dữ liệu đã yêu cầu, mục đích sử dụng, phạm vi quyền, thời hạn và tiến trình phê duyệt.'} actions={<Button>New access request</Button>} />
      <SummaryGrid><SummaryCard label="Pending" value={items.filter((item) => item.status === 'pending').length} detail="Oldest 2h 18m" tone="warning"/><SummaryCard label="Approved" value={items.filter((item) => item.status === 'approved').length} detail="1 expires in 27 days" tone="success"/><SummaryCard label="Policy impact" value="1" detail="Sensitive data review" tone="warning"/><SummaryCard label="Decision SLA" value="98%" detail="Target under 8 business hours" tone="info"/></SummaryGrid>
      <Tabs items={canDecide ? ['Approval queue','Decided by me','My requests'] : ['My requests','Available entitlements']} />
      <DataToolbar placeholder="Tìm requester, dataset hoặc purpose" filters={<><button>Pending</button><button>Sensitivity</button><button>Duration</button></>} />
      <SectionCard title={canDecide ? 'Approval queue' : 'Request history'} description="Every decision records a deterministic audit and correlation reference">
      <div className="enterprise-table-wrap"><Table data-testid="access-requests-table">
      <TableHeader>
        <TableRow>
          <TableHead>Resource</TableHead>
          <TableHead>Người yêu cầu</TableHead>
          <TableHead>Purpose / scope</TableHead>
          <TableHead>Access / duration</TableHead>
          <TableHead>Sensitivity / policy</TableHead>
          <TableHead>Approver / timeline</TableHead>
          <TableHead>Trạng thái</TableHead>
          {canDecide && <TableHead className="text-right">Hành động</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((req) => (
          <TableRow key={req.id} data-testid={`access-request-row-${req.id}`}>
            <TableCell><strong>{req.resource === 'conn-0001' ? 'Sales source & fact_sales_daily' : req.resource}</strong><div className="font-mono text-[9px] text-slate-400">{req.id} · {req.resource}</div></TableCell>
            <TableCell><strong>{req.requestedBy.replace('persona-', '').replaceAll('-', ' ')}</strong><div className="text-[10px] text-slate-500">Khối nghiệp vụ giả lập · {req.workspaceId}</div></TableCell>
            <TableCell>Phân tích hiệu quả kênh bán<div className="text-[10px] text-slate-500">Aggregated reporting · no redistribution</div></TableCell>
            <TableCell><strong>{req.entitlement}</strong><div className="text-[10px] text-slate-500">30 days · expires 05/02/2026</div></TableCell>
            <TableCell><StatusChip tone="warning">Internal · masked PII</StatusChip><div className="mt-1 text-[10px] text-slate-500">Manager approval required</div></TableCell>
            <TableCell>Tenant Admin<div className="text-[10px] text-slate-500">Submitted {new Date(req.createdAt).toLocaleString('vi-VN')} · SLA 8h</div></TableCell>
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
    </Table></div></SectionCard>
      <div className="muted-note">Negative states are explicit: expired, rejected, duplicate and policy-blocked requests remain visible with decision reason and timeline.</div>
    </div>
  )
}
