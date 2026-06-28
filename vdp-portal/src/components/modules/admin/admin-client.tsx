'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentUser } from '@/hooks/use-current-user'
import { apiFetch } from '@/lib/api-client'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  RefreshCwIcon,
  ShieldIcon,
  UsersIcon,
  ServerIcon,
  FileTextIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
} from 'lucide-react'
import type { KeycloakUser, KeycloakRoleRepresentation } from '@/lib/services/keycloak-admin'

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

interface NodeStatus {
  name: string
  status: string
  cpu: string
  memory: string
  role: string
}

interface ClusterHealthData {
  connected: boolean
  warning?: string
  nodes: NodeStatus[]
  namespacesCount: number
  pods: { total: number; running: number; pending: number; failed: number }
}

interface AuditLog {
  id: string
  timestamp: string
  user: string
  action: string
  detail: string
  status: string
}

export function AdminClient() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'users' | 'k8s' | 'logs'>('users')
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [pendingRoleIds, setPendingRoleIds] = useState<Set<string>>(new Set())

  const { data: usersData, isLoading, refetch: reload, isFetching } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await apiFetch<{ success: boolean; data: KeycloakUser[] }>('/admin/users')
      return res.data ?? []
    },
    enabled: activeTab === 'users',
  })

  const { data: allRoles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await apiFetch<{ success: boolean; data: KeycloakRoleRepresentation[] }>('/admin/roles')
      return res.data ?? []
    },
    enabled: activeTab === 'users',
  })

  const { data: userRoles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ['admin-user-roles', selectedUser?.id],
    queryFn: async () => {
      const res = await apiFetch<{ success: boolean; data: KeycloakRoleRepresentation[] }>(`/admin/users/${selectedUser!.id}/roles`)
      return res.data ?? []
    },
    enabled: !!selectedUser,
  })

  const { data: clusterData, isLoading: isLoadingCluster, refetch: reloadCluster } = useQuery({
    queryKey: ['admin-cluster-health'],
    queryFn: async () => {
      const res = await apiFetch<{ success: boolean; data: ClusterHealthData }>('/admin/cluster/health')
      return res.data
    },
    enabled: activeTab === 'k8s',
  })

  const { data: auditLogsData, isLoading: isLoadingLogs, refetch: reloadLogs } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await apiFetch<{ success: boolean; data: AuditLog[] }>('/admin/audit-logs')
      return res.data ?? []
    },
    enabled: activeTab === 'logs',
  })

  const assignMutation = useMutation({
    mutationFn: async ({ userId, roleId, roleName }: { userId: string; roleId: string; roleName: string }) => {
      const res = await apiFetch<{ success: boolean; error?: string }>(`/admin/users/${userId}/roles`, {
        method: 'POST',
        body: JSON.stringify({ roleId, roleName }),
      })
      if (!res.success) throw new Error(res.error ?? 'Lỗi gán role')
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
      const res = await apiFetch<{ success: boolean; error?: string }>(`/admin/users/${userId}/roles`, {
        method: 'DELETE',
        body: JSON.stringify({ roleId, roleName }),
      })
      if (!res.success) throw new Error(res.error ?? 'Lỗi xóa role')
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
  const auditLogs = auditLogsData ?? []
  const currentUserRoleIds = new Set(userRoles?.map((r) => r.id) ?? [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản trị hệ thống</h1>
          <p className="text-sm text-slate-500">Dành riêng cho SuperAdmin — Quản lý tài khoản, K8s cluster và nhật ký hệ thống</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (activeTab === 'users') reload()
            if (activeTab === 'k8s') reloadCluster()
            if (activeTab === 'logs') reloadLogs()
          }}
          disabled={isFetching}
        >
          <RefreshCwIcon className={`size-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UsersIcon className="size-4" />
          <span>Keycloak Users</span>
        </button>
        <button
          onClick={() => setActiveTab('k8s')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'k8s' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ServerIcon className="size-4" />
          <span>K8s Cluster Health</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileTextIcon className="size-4" />
          <span>System Logs / Audit Trail</span>
        </button>
      </div>

      {/* Tab 1: Users */}
      {activeTab === 'users' && (
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
      )}

      {/* Tab 2: K8s Cluster Health */}
      {activeTab === 'k8s' && (
        <div className="space-y-6">
          {isLoadingCluster ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !clusterData ? (
            <p className="text-slate-400">Không có dữ liệu cluster.</p>
          ) : (
            <>
              {clusterData.warning && (
                <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 text-sm">
                  <AlertTriangleIcon className="size-5 text-yellow-600 shrink-0" />
                  <span>{clusterData.warning}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Trạng thái kết nối K8s</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <CheckCircle2Icon className="size-6 text-green-500" />
                      <span className="text-xl font-bold text-slate-800">
                        {clusterData.connected ? 'Connected' : 'Mất kết nối'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Namespaces</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-slate-900">{clusterData.namespacesCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Tổng số Pods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-bold text-slate-900">{clusterData.pods.total}</span>
                      <span className="text-xs text-green-600 font-medium">Running: {clusterData.pods.running}</span>
                      <span className="text-xs text-yellow-600 font-medium">Pending: {clusterData.pods.pending}</span>
                      {clusterData.pods.failed > 0 && (
                        <span className="text-xs text-red-600 font-medium">Failed: {clusterData.pods.failed}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50 font-semibold text-slate-800">
                  Danh sách Nodes ({clusterData.nodes.length})
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên Node</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>CPU Allocatable</TableHead>
                      <TableHead>Memory Allocatable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clusterData.nodes.map((node) => (
                      <TableRow key={node.name}>
                        <TableCell className="font-mono font-medium text-slate-800">{node.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{node.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            node.status === 'Ready' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            <span className={`size-1.5 rounded-full ${node.status === 'Ready' ? 'bg-green-600' : 'bg-red-600'}`} />
                            {node.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{node.cpu}</TableCell>
                        <TableCell className="font-mono text-sm text-slate-600">{node.memory}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 3: System Logs */}
      {activeTab === 'logs' && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-slate-50 font-semibold text-slate-800 flex items-center justify-between">
            <span>Nhật ký Kiểm toán (Audit Trail)</span>
            <span className="text-xs text-slate-400 font-normal">5 sự kiện gần nhất</span>
          </div>
          {isLoadingLogs ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Chưa có nhật ký nào recorded.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Thời gian</TableHead>
                  <TableHead className="w-[120px]">Người thực hiện</TableHead>
                  <TableHead className="w-[140px]">Hành động</TableHead>
                  <TableHead>Chi tiết</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-slate-500 flex items-center gap-1.5">
                      <ClockIcon className="size-3.5 text-slate-400" />
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">{log.user}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[11px]">{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{log.detail}</TableCell>
                    <TableCell>
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        {log.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Dialog sửa role */}
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
