'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { DeleteConnectionButton } from './delete-connection-button'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { Connection, PersonaRole } from '@/lib/ba-draft/fixtures/types'

const STATUS_VARIANT: Record<Connection['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  paused: 'secondary',
  validating: 'outline',
  invalid: 'destructive',
  deleting: 'destructive',
}

export function ConnectionsClient({ personaRole }: { personaRole: PersonaRole }) {
  const queryClient = useQueryClient()
  const [pendingValidateId, setPendingValidateId] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-connections'],
    queryFn: () => productApi.get<{ items: Connection[] }>('/connections'),
  })

  const validateMutation = useMutation({
    mutationFn: (id: string) => {
      setPendingValidateId(id)
      return productApi.post(`/connections/${id}/validate`)
    },
    onSuccess: () => {
      toast.success('Validate connection thành công.')
      queryClient.invalidateQueries({ queryKey: ['ba-connections'] })
    },
    onError: (err) => {
      toast.error(err instanceof ProductApiError ? err.message : 'Validate thất bại.')
    },
    onSettled: () => setPendingValidateId(null),
  })

  if (isLoading) return <LoadingState label="Đang tải connections…" />
  if (error) return <ErrorState message="Không thể tải danh sách connections." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có connection nào trong workspace này." />

  return (
    <Table data-testid="connections-table">
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Đang dùng?</TableHead>
          <TableHead>Validate lần cuối</TableHead>
          <TableHead className="text-right">Hành động</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((conn) => (
          <TableRow key={conn.id} data-testid={`connection-row-${conn.id}`}>
            <TableCell className="font-medium">{conn.name}</TableCell>
            <TableCell>{conn.type}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[conn.status]}>{conn.status}</Badge>
            </TableCell>
            <TableCell>{conn.inUse ? 'Có' : 'Không'}</TableCell>
            <TableCell>{conn.lastValidatedAt ? new Date(conn.lastValidatedAt).toLocaleString('vi-VN') : '—'}</TableCell>
            <TableCell className="text-right space-x-1">
              <Button
                variant="outline"
                size="sm"
                data-testid={`validate-connection-${conn.id}`}
                onClick={() => validateMutation.mutate(conn.id)}
                disabled={pendingValidateId === conn.id}
              >
                {pendingValidateId === conn.id ? 'Đang validate…' : 'Validate'}
              </Button>
              <DeleteConnectionButton connection={conn} personaRole={personaRole} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
