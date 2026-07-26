'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { Dataset } from '@/lib/ba-draft/fixtures/types'

const STATUS_VARIANT: Record<Dataset['publicationStatus'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  publishing: 'outline',
  published: 'default',
  failed: 'destructive',
}

export function DatasetsClient() {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-datasets'],
    queryFn: () => productApi.get<{ items: Dataset[] }>('/datasets'),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => productApi.post(`/datasets/${id}/publish`, { scenario: 'success' }),
    onSuccess: () => {
      toast.success('Đã publish dataset và đăng ký vào catalog.')
      queryClient.invalidateQueries({ queryKey: ['ba-datasets'] })
      queryClient.invalidateQueries({ queryKey: ['ba-catalog'] })
    },
    onError: (err) => toast.error(err instanceof ProductApiError ? err.message : 'Publish thất bại.'),
  })

  if (isLoading) return <LoadingState label="Đang tải datasets…" />
  if (error) return <ErrorState message="Không thể tải danh sách datasets." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có dataset nào." />

  return (
    <Table data-testid="datasets-table">
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Trạng thái publish</TableHead>
          <TableHead>Trong catalog?</TableHead>
          <TableHead className="text-right">Hành động</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((ds) => (
          <TableRow key={ds.id} data-testid={`dataset-row-${ds.id}`}>
            <TableCell className="font-medium">{ds.name}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[ds.publicationStatus]}>{ds.publicationStatus}</Badge>
            </TableCell>
            <TableCell>{ds.catalogRegistered ? 'Có' : 'Không'}</TableCell>
            <TableCell className="text-right">
              {ds.publicationStatus !== 'published' && (
                <Button
                  size="sm"
                  data-testid={`publish-dataset-${ds.id}`}
                  onClick={() => publishMutation.mutate(ds.id)}
                  disabled={publishMutation.isPending}
                >
                  Publish
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
