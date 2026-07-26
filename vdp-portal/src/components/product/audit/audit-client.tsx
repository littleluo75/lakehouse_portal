'use client'

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { AuditEvent } from '@/lib/ba-draft/fixtures/types'

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
    <Table data-testid="audit-table">
      <TableHeader>
        <TableRow>
          <TableHead>Thời gian</TableHead>
          <TableHead>Người thực hiện</TableHead>
          <TableHead>Hành động</TableHead>
          <TableHead>Đối tượng</TableHead>
          <TableHead>Kết quả</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((e) => (
          <TableRow key={e.id} data-testid={`audit-row-${e.id}`}>
            <TableCell className="text-xs">{new Date(e.at).toLocaleString('vi-VN')}</TableCell>
            <TableCell>{e.actor}</TableCell>
            <TableCell className="font-mono text-xs">{e.action}</TableCell>
            <TableCell className="text-xs">{e.target}</TableCell>
            <TableCell>
              <Badge variant={OUTCOME_VARIANT[e.outcome]}>{e.outcome}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
