'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Play, Code2, BookOpen, Search, FolderOpen, BarChart3,
  Activity, Zap, Database, ServerIcon, RefreshCwIcon,
  WorkflowIcon,
} from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { apiFetch } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DashboardSummary, DashboardHealth } from '@/types/dashboard'
import type { KeycloakRole } from '@/types'
import type { QueryHistoryItem } from '@/types/sql'

const HISTORY_KEY = 'lighthouse-portal_query_history'

const ROLE_COLORS: Record<string, string> = {
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

const QUICK_ACTIONS: { label: string; Icon: React.ElementType; href: string; roles: KeycloakRole[] }[] = [
  { label: 'Trigger DAG', Icon: Play, href: '/workflows', roles: ['Op', 'Admin', 'SuperAdmin'] },
  { label: 'Mở SQL Editor', Icon: Code2, href: '/query', roles: ['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'] },
  { label: 'Mở Notebook', Icon: BookOpen, href: '/notebooks', roles: ['DE', 'DS', 'Admin', 'SuperAdmin'] },
  { label: 'Tìm trong Catalog', Icon: Search, href: '/catalog', roles: ['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'] },
  { label: 'Xem Storage', Icon: FolderOpen, href: '/storage', roles: ['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'] },
  { label: 'Xem Observability', Icon: BarChart3, href: '/observability', roles: ['Op', 'Admin', 'SuperAdmin', 'PM'] },
]

function healthColor(status: DashboardHealth['status']): string {
  if (status === 'healthy') return 'bg-green-500'
  if (status === 'degraded') return 'bg-yellow-400'
  return 'bg-red-500'
}

function StatCard({
  label, value, icon: Icon, isLoading, visible,
}: {
  label: string
  value: React.ReactNode
  icon: React.ElementType
  isLoading: boolean
  visible: boolean
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
          <Icon className="size-4 text-slate-400" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : !visible ? (
          <span className="text-3xl font-bold text-slate-300">—</span>
        ) : value === null ? (
          <span className="text-xl font-semibold text-slate-400">Không khả dụng</span>
        ) : (
          <div className="text-3xl font-bold text-slate-900">{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

function HealthDot({ health, lastChecked }: { health: DashboardHealth; lastChecked: Date | null }) {
  const [secAgo, setSecAgo] = useState<number | null>(null)

  useEffect(() => {
    if (!lastChecked) {
      queueMicrotask(() => setSecAgo(null))
      return
    }
    const update = () => setSecAgo(Math.floor((Date.now() - lastChecked.getTime()) / 1000))
    queueMicrotask(update)
    const timer = setInterval(update, 5000)
    return () => clearInterval(timer)
  }, [lastChecked])

  const tooltipText = [
    health.status === 'down' && health.error ? health.error
      : health.status === 'degraded' ? `Degraded${health.latencyMs ? ` (${health.latencyMs}ms)` : ''}`
      : `Healthy${health.latencyMs ? ` (${health.latencyMs}ms)` : ''}`,
    secAgo !== null ? `Checked ${secAgo}s ago` : null,
  ].filter(Boolean).join(' · ')

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 shadow-sm hover:bg-slate-50 cursor-default w-full text-left">
          <span className={`size-2.5 shrink-0 rounded-full ${healthColor(health.status)}`} />
          <span className="flex-1 text-sm font-medium text-slate-700 truncate">{health.name}</span>
          {health.latencyMs !== null ? (
            <span className="text-xs text-slate-400 tabular-nums">{health.latencyMs}ms</span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltipText}</TooltipContent>
    </Tooltip>
  )
}

function RunStateBadge({ state }: { state: string }) {
  const cls =
    state === 'success' ? 'bg-green-100 text-green-700' :
    state === 'running' ? 'bg-blue-100 text-blue-700' :
    state === 'failed' ? 'bg-red-100 text-red-700' :
    'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{state}</span>
}

function SparkStateBadge({ state }: { state: string }) {
  const cls =
    state === 'RUNNING' ? 'bg-blue-100 text-blue-700' :
    state === 'COMPLETED' ? 'bg-green-100 text-green-700' :
    state === 'FAILED' ? 'bg-red-100 text-red-700' :
    'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{state}</span>
}

function timeAgo(isoDate: string | null): string {
  if (!isoDate) return '—'
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} giờ trước`
  return `${Math.floor(hrs / 24)} ngày trước`
}

export function DashboardClient() {
  const { user, hasRole, isLoading: isSessionLoading } = useCurrentUser()
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([])

  const { data, isLoading, refetch: reload } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await apiFetch<{ success: boolean; data: DashboardSummary }>('/dashboard/summary')
      setLastChecked(new Date())
      return res.data!
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as QueryHistoryItem[]
        setQueryHistory(stored.slice(0, 5))
      } catch {
        setQueryHistory([])
      }
    })
  }, [])

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const primaryRole = user?.roles?.[0] ?? null

  const canViewDags = hasRole(['DE', 'Op', 'Admin', 'SuperAdmin'])
  const canViewSpark = hasRole(['DE', 'Op', 'Admin', 'SuperAdmin'])
  const canViewStorage = hasRole(['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'])
  const canViewNotebooks = hasRole(['Admin', 'SuperAdmin'])
  const canViewActivity = hasRole(['DE', 'Op', 'Admin', 'SuperAdmin'])
  const isAnalyst = hasRole(['DA', 'DS'])
  const isViewerRole = hasRole(['BA', 'PM', 'Viewer'])

  const visibleActions = QUICK_ACTIONS.filter((a) => hasRole(a.roles)).slice(0, 4)

  return (
    <TooltipProvider delay={300}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {isSessionLoading ? (
              <Skeleton className="h-8 w-64 mb-2" />
            ) : (
              <h1 className="text-2xl font-bold text-slate-900">
                Xin chào, {user?.name ?? user?.email ?? 'bạn'} 👋
              </h1>
            )}
            <p className="text-sm text-slate-500 capitalize">{today}</p>
          </div>
          <div className="flex items-center gap-2">
            {primaryRole && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROLE_COLORS[primaryRole] ?? 'bg-slate-100 text-slate-600'}`}>
                {primaryRole}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => reload()} disabled={isLoading}>
              <RefreshCwIcon className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="DAGs đang active"
            value={data?.stats.activeDags ?? null}
            icon={WorkflowIcon}
            isLoading={isLoading}
            visible={canViewDags}
          />
          <StatCard
            label="Spark Jobs đang chạy"
            value={data?.stats.runningSparkJobs ?? null}
            icon={Zap}
            isLoading={isLoading}
            visible={canViewSpark}
          />
          <StatCard
            label="Storage"
            value={data?.stats.storageUsed != null
              ? `${data.stats.storageUsed.bucketCount} buckets`
              : null}
            icon={Database}
            isLoading={isLoading}
            visible={canViewStorage}
          />
          <StatCard
            label="Notebooks online"
            value={data?.stats.activeNotebooks ?? null}
            icon={ServerIcon}
            isLoading={isLoading}
            visible={canViewNotebooks}
          />
        </div>

        {/* Platform Health Grid */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-800">Trạng thái nền tảng</h2>
            {lastChecked && (
              <span className="text-xs text-slate-400">
                Cập nhật lúc {lastChecked.toLocaleTimeString('vi-VN')} · tự động mỗi 60s
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(data?.health ?? []).map((h) => (
                <HealthDot key={h.name} health={h} lastChecked={lastChecked} />
              ))}
            </div>
          )}
        </div>

        {/* K8s Cluster Stats */}
        {data?.clusterStats && (
          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-800 flex items-center gap-2">
              <ServerIcon className="size-4 text-slate-500" />
              <span>K8s Cluster Stats</span>
              {!data.clusterStats.connected && (
                <span className="text-xs font-normal text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                  Không khả dụng
                </span>
              )}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-slate-800">
                    {data.clusterStats.nodeCount !== null ? `${data.clusterStats.nodeCount} nodes` : 'Không khả dụng'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">CPU Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-slate-800">
                    {data.clusterStats.cpuCapacity !== null ? data.clusterStats.cpuCapacity : 'Không khả dụng'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">Memory Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-slate-800">
                    {data.clusterStats.memoryCapacity !== null ? data.clusterStats.memoryCapacity : 'Không khả dụng'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Recent Activity — role-filtered */}
        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-800">Hoạt động gần đây</h2>

          {canViewActivity && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Recent DAG Runs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <WorkflowIcon className="size-4 text-slate-400" />
                    Workflows gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : !data?.activity.recentDagRuns?.length ? (
                    <p className="py-2 text-sm text-slate-400">Chưa có DAG run nào</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {data.activity.recentDagRuns.map((run) => (
                        <li key={run.runId} className="flex items-center justify-between gap-2 py-2">
                          <span className="truncate font-mono text-xs text-slate-700">{run.dagId}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <RunStateBadge state={run.state} />
                            <span className="text-xs text-slate-400 tabular-nums">{timeAgo(run.startDate)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Recent Spark Jobs */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="size-4 text-slate-400" />
                    Spark Jobs gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                    </div>
                  ) : !data?.activity.recentSparkJobs?.length ? (
                    <p className="py-2 text-sm text-slate-400">Không có Spark jobs</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {data.activity.recentSparkJobs.map((job) => (
                        <li key={job.name} className="flex items-center justify-between gap-2 py-2">
                          <span className="truncate font-mono text-xs text-slate-700">{job.name}</span>
                          <div className="flex shrink-0 items-center gap-2">
                            <SparkStateBadge state={job.state} />
                            <span className="text-xs text-slate-400 tabular-nums">{timeAgo(job.creationTimestamp)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {(isAnalyst || queryHistory.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Code2 className="size-4 text-slate-400" />
                  Query gần đây
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queryHistory.length === 0 ? (
                  <p className="py-2 text-sm text-slate-400">Chưa có query nào. Mở SQL Editor để bắt đầu.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {queryHistory.map((item) => (
                      <li key={item.id} className="flex flex-col gap-0.5 py-2">
                        <span className="truncate font-mono text-xs text-slate-700">{item.sql}</span>
                        <span className="text-[10px] text-slate-400">
                          {item.engine} · {new Date(item.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {isViewerRole && !isAnalyst && !canViewActivity && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="size-4 text-slate-400" />
                  Tổng quan nền tảng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Theo dõi các chỉ số hoạt động của VNPT Data Platform qua Grafana.
                  </p>
                  <a
                    href={process.env.NEXT_PUBLIC_GRAFANA_URL ?? 'https://grafana.lakehouse.local'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                  >
                    <BarChart3 className="size-4" />
                    Xem báo cáo đầy đủ trong Grafana →
                  </a>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        {visibleActions.length > 0 && (
          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-800">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {visibleActions.map(({ label, Icon, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col items-center justify-center gap-2 rounded-xl border bg-white p-4 text-center shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-blue-50">
                    <Icon className="size-5 text-slate-500 transition-colors group-hover:text-blue-600" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
