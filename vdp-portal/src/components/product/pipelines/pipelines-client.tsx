'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { Pipeline } from '@/lib/ba-draft/fixtures/types'

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
    <Table data-testid="pipelines-table">
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Số node</TableHead>
          <TableHead>Revision</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((p) => (
          <TableRow key={p.id} data-testid={`pipeline-row-${p.id}`}>
            <TableCell>
              <Link href={`/pipelines/${p.id}`} className="font-medium text-blue-600 hover:underline">
                {p.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
            </TableCell>
            <TableCell>{p.nodes.length}</TableCell>
            <TableCell>rev {p.revision}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
