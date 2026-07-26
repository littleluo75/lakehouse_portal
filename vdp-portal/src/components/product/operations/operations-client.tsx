'use client'

import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OperationStatusBadge, LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { Operation } from '@/lib/ba-draft/fixtures/types'

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
    <Table data-testid="operations-table">
      <TableHeader>
        <TableRow>
          <TableHead>Loại</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Trạng thái quan sát</TableHead>
          <TableHead>Retry</TableHead>
          <TableHead>Ghi chú</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((op) => (
          <TableRow key={op.id} data-testid={`operation-row-${op.id}`}>
            <TableCell className="font-medium">{op.kind}</TableCell>
            <TableCell>
              <OperationStatusBadge status={op.status} />
            </TableCell>
            <TableCell>
              <OperationStatusBadge status={op.observedStatus} />
              <div className="text-xs text-slate-400 mt-1">lúc {new Date(op.observedAt).toLocaleTimeString('vi-VN')}</div>
            </TableCell>
            <TableCell>{op.retryCount}</TableCell>
            <TableCell className="text-slate-500">{op.message ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
