'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCwIcon, ShieldIcon } from 'lucide-react'
import type { KeycloakUser, KeycloakRoleRepresentation } from '@/lib/services/keycloak-admin'
import type { ApiResponse } from '@/types'

const ROLE_COLOR: Record<string, string> = {
  SuperAdmin: 'bg-red-100 text-red-700',
  Admin: 'bg-orange-100 text-orange-700',
  Op: 'bg-yellow-100 text-yellow-700',
  PM: 'bg-purple-100 text-purple-700',
  DE: 'bg-blue-100 text-blue-700',
  DS: 'bg-cyan-100 text-cyan-700',
  DA: 'bg-green-100 text-green-700',
  BA: 'bg-teal-100 text-teal-700',
  Viewer: 'bg-slate-100 text-slate-600',
}

interface UserWithRoles extends KeycloakUser {
  currentRoles?: KeycloakRoleRepresentation[]
}

export function AdminClient() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useCurrentUser()
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [pendingRoleIds, setPendingRoleIds] = useState<Set<string>>(new Set())

  const { data: usersData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Không thể tải danh sách users')
      const json = await res.json() as ApiResponse<KeycloakUser[]>
      return json.data ?? []
    },
  })

  const { data: allRoles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await fetch('/api/admin/roles')
      if (!res.ok) throw new Error('Không thể tải danh sách roles')
      const json = await res.json() as ApiResponse<KeycloakRoleRepresentation[]>
      return json.data ?? []
    },
  })

  const { data: userRoles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['admin-user-roles', selectedUser?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${selectedUser!.id}/roles`)
      if (!res.ok) throw new Error('Không thể tải roles của user')
      const json = await res.json() as ApiResponse<KeycloakRoleRepresentation[]>
      return json.data ?? []
    },
    enabled: !!selectedUser,
  })

  const assignMutation = useMutation({
    mutationFn: async ({ userId, roleId, roleName }: { userId: string; roleId: string; roleName: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, roleName }),
      })
      const json = await res.json() as ApiResponse<null>
      if (!json.success) throw new Error(json.error ?? 'Lỗi gán role')
    },
    onSuccess: (_, { roleName }) => {
      toast.success(`Đã gán role ${roleName}`)
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles', selectedUser?.id] })
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: (_, __, { roleId }) => {
      setPendingRoleIds((prev) => { const s = new Set(prev); s.delete(roleId); return s })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async ({ userId, roleId, roleName }: { userId: string; roleId: string; roleName: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId, roleName }),
      })
      const json = await res.json() as ApiResponse<null>
      if (!json.success) throw new Error(json.error ?? 'Lỗi xóa role')
    },
    onSuccess: (_, { roleName }) => {
      toast.success(`Đã xóa role ${roleName}`)
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles', selectedUser?.id] })
    },
    onError: (err: Error) => toast.error(err.message),
    onSettled: (_, __, { roleId }) => {
      setPendingRoleIds((prev) => { const s = new Set(prev); s.delete(roleId); return s })
    },
  })

  function handleRoleToggle(role: KeycloakRoleRepresentation, checked: boolean) {
    if (!selectedUser) return

    const isSelf = currentUser?.id === selectedUser.id
    if (isSelf && role.name === 'SuperAdmin' && !checked) {
      toast.error('Không thể xóa role SuperAdmin của chính mình')
      return
    }

    setPendingRoleIds((prev) => new Set([...prev, role.id]))

    if (checked) {
      assignMutation.mutate({ userId: selectedUser.id, roleId: role.id, roleName: role.name })
    } else {
      removeMutation.mutate({ userId: selectedUser.id, roleId: role.id, roleName: role.name })
    }
  }

  function getUserDisplayName(user: KeycloakUser) {
    if (user.firstName || user.lastName) {
      return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
    }
    return user.username
  }

  const users = usersData ?? []
  const currentUserRoleIds = new Set(userRoles?.map((r) => r.id) ?? [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản trị người dùng</h1>
          <p className="text-sm text-slate-500">Quản lý users và phân quyền qua Keycloak</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCwIcon className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">Không tìm thấy users nào.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Người dùng</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                        {(user.firstName?.[0] ?? user.username[0] ?? '?').toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">
                        {getUserDisplayName(user)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm text-slate-600">{user.username}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">{user.email ?? '—'}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {user.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setSelectedUser(user)}
                      className="gap-1.5"
                    >
                      <ShieldIcon className="size-3" />
                      Sửa roles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Phân quyền — {selectedUser ? getUserDisplayName(selectedUser) : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {isLoadingRoles ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {(allRoles ?? []).map((role) => {
                  const checked = currentUserRoleIds.has(role.id)
                  const isPending = pendingRoleIds.has(role.id)
                  const isSelfSuperAdmin =
                    currentUser?.id === selectedUser?.id && role.name === 'SuperAdmin'

                  return (
                    <label
                      key={role.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50 ${
                        isPending ? 'opacity-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isPending || isSelfSuperAdmin}
                        onChange={(e) => handleRoleToggle(role, e.target.checked)}
                        className="size-4 rounded border-slate-300 accent-blue-600"
                      />
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          ROLE_COLOR[role.name] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {role.name}
                      </span>
                      {isSelfSuperAdmin && (
                        <span className="text-xs text-slate-400">(không thể tự xóa)</span>
                      )}
                    </label>
                  )
                })}
                {(allRoles ?? []).length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-400">
                    Không có roles nào được cấu hình
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter showCloseButton>
            <div className="flex flex-wrap gap-1">
              {userRoles?.map((r) => (
                <Badge key={r.id} variant="secondary" className="text-xs">
                  {r.name}
                </Badge>
              ))}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
