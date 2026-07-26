'use client'

import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { CatalogEntry, Dataset } from '@/lib/ba-draft/fixtures/types'

type CatalogEntryWithDataset = CatalogEntry & { dataset?: Dataset }

export function BaCatalogClient() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-catalog'],
    queryFn: () => productApi.get<{ items: CatalogEntryWithDataset[] }>('/catalog'),
  })

  if (isLoading) return <LoadingState label="Đang tải catalog…" />
  if (error) return <ErrorState message="Không thể tải catalog." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có bảng nào được đăng ký vào catalog." />

  return (
    <Table data-testid="catalog-table">
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Đăng ký lúc</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((entry) => (
          <TableRow key={entry.id} data-testid={`catalog-row-${entry.id}`}>
            <TableCell className="font-medium">{entry.name}</TableCell>
            <TableCell>{entry.owner}</TableCell>
            <TableCell>{new Date(entry.registeredAt).toLocaleString('vi-VN')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
