'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { Connection, PersonaRole } from '@/lib/ba-draft/fixtures/types'

const DELETE_ALLOWED_ROLES: PersonaRole[] = ['DataEngineer', 'TenantAdmin', 'SuperAdmin']

/**
 * DEF-0002 correction. Previously there was no connection domain at all in
 * the portal, so "delete" was a dead control reachable by nothing. This is
 * the actual wiring: a visible, role-guarded, in-use-aware delete with a
 * confirmation dialog, an async mock operation, and an audit trail — see
 * tests/e2e/defects/def-0002-connection-delete.spec.ts for the regression
 * test and src/app/api/cp/v1/connections/[id]/route.ts for the guard logic.
 */
export function DeleteConnectionButton({ connection, personaRole }: { connection: Connection; personaRole: PersonaRole }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => productApi.delete(`/connections/${connection.id}`),
    onSuccess: () => {
      toast.success(`Đã xóa connection "${connection.name}".`)
      setOpen(false)
      queryClient.invalidateQueries({ queryKey: ['ba-connections'] })
    },
    onError: (err) => {
      const message = err instanceof ProductApiError ? err.message : 'Xóa connection thất bại.'
      toast.error(message)
      setOpen(false)
    },
  })

  if (!DELETE_ALLOWED_ROLES.includes(personaRole)) {
    return null
  }

  if (connection.inUse) {
    return (
      <Button variant="ghost" size="sm" disabled title="Connection đang được pipeline sử dụng, không thể xóa." data-testid={`delete-connection-disabled-${connection.id}`}>
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        Xóa
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" data-testid={`delete-connection-button-${connection.id}`}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Xóa
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa connection &quot;{connection.name}&quot;?</DialogTitle>
          <DialogDescription>
            Hành động này không thể hoàn tác. Connection sẽ bị xóa khỏi workspace và ghi nhận vào audit log.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            data-testid={`confirm-delete-connection-${connection.id}`}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Đang xóa…' : 'Xác nhận xóa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
