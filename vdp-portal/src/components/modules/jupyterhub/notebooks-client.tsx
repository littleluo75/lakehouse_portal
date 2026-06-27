'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ServerIcon,
  CircleIcon,
  ExternalLinkIcon,
  PowerIcon,
  RefreshCwIcon,
  InfoIcon,
} from 'lucide-react'
import type { JupyterServerStatus, JupyterProfile } from '@/types/jupyterhub'
import type { KeycloakRole } from '@/types'

interface ProfileDef {
  id: JupyterProfile
  label: string
  resources: string
  description: string
  roles: KeycloakRole[]
}

const PROFILES: ProfileDef[] = [
  {
    id: 'standard',
    label: 'Standard',
    resources: '1 CPU / 1 GB RAM',
    description: 'Phù hợp: phân tích nhẹ, viết script',
    roles: ['DE', 'DS', 'Admin', 'SuperAdmin'],
  },
  {
    id: 'medium',
    label: 'Medium',
    resources: '2 CPU / 2 GB RAM',
    description: 'Phù hợp: xử lý dữ liệu vừa',
    roles: ['DE', 'DS', 'Admin', 'SuperAdmin'],
  },
  {
    id: 'large',
    label: 'Large',
    resources: '4 CPU / 4 GB RAM',
    description: 'Phù hợp: training model, xử lý nặng',
    roles: ['DS', 'Admin', 'SuperAdmin'],
  },
]

function formatDuration(startedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  if (hours > 0) return `${hours} giờ ${minutes} phút`
  return `${minutes} phút`
}

export function NotebooksClient() {
  const queryClient = useQueryClient()
  const { user, hasRole } = useCurrentUser()

  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<JupyterProfile>('standard')

  const { data: statusData, isLoading, error } = useQuery({
    queryKey: ['jupyter-server'],
    queryFn: async () => {
      const res = await fetch('/api/jupyter/server')
      if (!res.ok) throw new Error('Không thể lấy trạng thái workspace')
      const json = await res.json() as { success: boolean; data: JupyterServerStatus }
      return json.data
    },
    refetchInterval: (query) => (query.state.data?.status === 'starting' ? 3000 : false),
  })

  const startMutation = useMutation({
    mutationFn: async (profile: JupyterProfile) => {
      const res = await fetch('/api/jupyter/server/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })
      if (!res.ok) {
        const json = await res.json() as { error?: string }
        throw new Error(json.error ?? 'Không thể khởi động workspace')
      }
    },
    onSuccess: () => {
      toast.success('Workspace đang được khởi động')
      setShowProfileDialog(false)
      queryClient.invalidateQueries({ queryKey: ['jupyter-server'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/jupyter/server/stop', { method: 'DELETE' })
      if (!res.ok) throw new Error('Không thể tắt workspace')
    },
    onSuccess: () => {
      toast.success('Workspace đã được tắt')
      setShowStopConfirm(false)
      queryClient.invalidateQueries({ queryKey: ['jupyter-server'] })
    },
    onError: () => toast.error('Không thể tắt workspace'),
  })

  const availableProfiles = PROFILES.filter((p) => hasRole(p.roles))

  const handleOpenProfileDialog = useCallback(() => {
    if (availableProfiles.length > 0) {
      setSelectedProfile(availableProfiles[0].id)
    }
    setShowProfileDialog(true)
  }, [availableProfiles])

  const labUrl = `https://jupyterhub.lakehouse.local/user/${user?.name ?? ''}/lab`

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Notebooks</h1>
        <Skeleton className="h-72 w-full max-w-2xl" />
      </div>
    )
  }

  const status = statusData?.status ?? 'stopped'
  const server = statusData?.server ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notebooks</h1>
        <p className="text-sm text-slate-500">Quản lý Jupyter Notebook workspace của bạn</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không thể kết nối tới JupyterHub. Kiểm tra lại kết nối hệ thống.
        </div>
      )}

      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Workspace Status</CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'stopped' && (
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="flex size-20 items-center justify-center rounded-full bg-slate-100">
                  <ServerIcon className="size-10 text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-700">Workspace chưa khởi động</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Chọn profile phù hợp để bắt đầu làm việc
                  </p>
                </div>
                <Button size="lg" onClick={handleOpenProfileDialog}>
                  Khởi động Workspace
                </Button>
              </div>
            )}

            {status === 'starting' && (
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="flex size-20 items-center justify-center rounded-full bg-blue-50">
                  <RefreshCwIcon className="size-10 animate-spin text-blue-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-700">
                    Đang khởi động workspace...
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Quá trình này có thể mất 1–2 phút
                  </p>
                </div>
                <div className="w-full">
                  <Progress value={null} className="h-2" />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowStopConfirm(true)}
                  disabled={stopMutation.isPending}
                >
                  Huỷ
                </Button>
              </div>
            )}

            {status === 'running' && server && (
              <div className="flex flex-col items-center gap-6 py-6">
                <div className="flex size-20 items-center justify-center rounded-full bg-green-50">
                  <CircleIcon className="size-10 fill-green-500 text-green-500" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-slate-700">Workspace đang chạy</p>
                  <p className="mt-1 text-sm text-green-600">Sẵn sàng sử dụng</p>
                </div>

                <div className="w-full space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <InfoIcon className="size-4" />
                    Thông tin Workspace
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-slate-500">Thời gian đã chạy:</span>
                    <span className="text-slate-700">Đã chạy {formatDuration(server.started)}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Workspace sẽ tự động tắt sau 8 giờ không hoạt động.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button size="lg" onClick={() => window.open(labUrl, '_blank')}>
                    <ExternalLinkIcon className="size-4" />
                    Mở JupyterLab
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowStopConfirm(true)}
                    disabled={stopMutation.isPending}
                  >
                    <PowerIcon className="size-4" />
                    Tắt Workspace
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Selection Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chọn Profile Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {availableProfiles.map((profile) => (
              <label
                key={profile.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  selectedProfile === profile.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="jupyter-profile"
                  value={profile.id}
                  checked={selectedProfile === profile.id}
                  onChange={() => setSelectedProfile(profile.id)}
                  className="mt-0.5 accent-blue-600"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{profile.label}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                      {profile.resources}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{profile.description}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileDialog(false)}>
              Huỷ
            </Button>
            <Button
              onClick={() => startMutation.mutate(selectedProfile)}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? 'Đang khởi động...' : 'Khởi động'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stop Confirm Dialog */}
      <Dialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tắt Workspace?</DialogTitle>
          </DialogHeader>
          <p className="py-2 text-sm text-slate-500">
            Workspace sẽ bị dừng. Mọi tiến trình đang chạy sẽ bị kết thúc. Dữ liệu đã lưu sẽ
            không bị mất.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStopConfirm(false)}>
              Giữ lại
            </Button>
            <Button
              variant="destructive"
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
            >
              {stopMutation.isPending ? 'Đang tắt...' : 'Tắt Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
