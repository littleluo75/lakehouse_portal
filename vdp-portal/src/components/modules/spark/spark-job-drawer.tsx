'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SparkStateBadge } from './spark-status-badge'
import { XIcon, ExternalLinkIcon, RefreshCwIcon } from 'lucide-react'
import type { SparkApplication } from '@/types/spark'

function formatDuration(startIso?: string, endIso?: string): string {
  if (!startIso) return '—'
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const seconds = Math.floor((end - start) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function getSparkUiUrl(app: SparkApplication): string {
  const ingressUrl = app.status?.sparkWebUI?.ingressURL
  if (ingressUrl) return ingressUrl
  return `https://${app.metadata.name}-spark-operator.spark-ui.lakehouse.local`
}

interface SparkJobDrawerProps {
  app: SparkApplication | null
  open: boolean
  onClose: () => void
}

export function SparkJobDrawer({ app, open, onClose }: SparkJobDrawerProps) {
  const [logsKey, setLogsKey] = useState(0)

  const { data: logsData, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['spark-logs', app?.metadata.name, logsKey],
    queryFn: async () => {
      const ns = app!.metadata.namespace
      const res = await fetch(
        `/api/spark/applications/${app!.metadata.name}/logs?namespace=${ns}&lines=100`
      )
      if (!res.ok) throw new Error('Không thể tải logs')
      const json = await res.json() as { success: boolean; data: { logs: string } }
      return json.data.logs
    },
    enabled: !!app && open,
  })

  const state = app?.status?.applicationState?.state ?? 'UNKNOWN'
  const sparkUiUrl = app ? getSparkUiUrl(app) : ''

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      )}

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-screen w-[560px] overflow-hidden bg-white shadow-xl transition-transform duration-300 ease-in-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {app && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between border-b px-6 py-5 shrink-0">
              <div className="flex-1 space-y-1 pr-4">
                <h2 className="font-mono text-base font-semibold text-slate-900 break-all">
                  {app.metadata.name}
                </h2>
                <div className="flex items-center gap-2">
                  <SparkStateBadge state={state} />
                  <span className="text-xs text-slate-400 font-mono">{app.spec.type}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 border-b px-6 py-3 shrink-0">
              <a href={sparkUiUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLinkIcon className="size-3.5" />
                  Spark UI
                </Button>
              </a>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs defaultValue="spec" className="flex flex-col h-full">
                <TabsList className="mx-6 mt-4 shrink-0 w-fit">
                  <TabsTrigger value="spec">Thông tin</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="spec" className="flex-1 overflow-y-auto px-6 py-4">
                  <div className="space-y-4 text-sm">
                    {/* Spec */}
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cấu hình
                      </h3>
                      <dl className="space-y-2">
                        <div className="flex gap-2">
                          <dt className="w-40 shrink-0 text-slate-500">Type</dt>
                          <dd className="font-mono text-slate-800">{app.spec.type}</dd>
                        </div>
                        {app.spec.sparkVersion && (
                          <div className="flex gap-2">
                            <dt className="w-40 shrink-0 text-slate-500">Spark Version</dt>
                            <dd className="font-mono text-slate-800">{app.spec.sparkVersion}</dd>
                          </div>
                        )}
                        {app.spec.mainClass && (
                          <div className="flex gap-2">
                            <dt className="w-40 shrink-0 text-slate-500">Main Class</dt>
                            <dd className="font-mono text-xs break-all text-slate-800">{app.spec.mainClass}</dd>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <dt className="w-40 shrink-0 text-slate-500">App File</dt>
                          <dd className="font-mono text-xs break-all text-slate-800">{app.spec.mainApplicationFile}</dd>
                        </div>
                      </dl>
                    </section>

                    {/* Status */}
                    <section>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Trạng thái
                      </h3>
                      <dl className="space-y-2">
                        <div className="flex gap-2">
                          <dt className="w-40 shrink-0 text-slate-500">State</dt>
                          <dd><SparkStateBadge state={state} /></dd>
                        </div>
                        {app.status?.applicationState?.errorMessage && (
                          <div className="flex gap-2">
                            <dt className="w-40 shrink-0 text-red-500">Lỗi</dt>
                            <dd className="text-red-600 text-xs break-all">{app.status.applicationState.errorMessage}</dd>
                          </div>
                        )}
                        {app.status?.driverInfo?.podName && (
                          <div className="flex gap-2">
                            <dt className="w-40 shrink-0 text-slate-500">Driver Pod</dt>
                            <dd className="font-mono text-xs text-slate-800">{app.status.driverInfo.podName}</dd>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <dt className="w-40 shrink-0 text-slate-500">Bắt đầu</dt>
                          <dd className="text-slate-800">
                            {app.status?.lastSubmissionAttemptTime
                              ? new Date(app.status.lastSubmissionAttemptTime).toLocaleString('vi-VN')
                              : '—'}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="w-40 shrink-0 text-slate-500">Thời gian chạy</dt>
                          <dd className="text-slate-800">
                            {formatDuration(
                              app.status?.lastSubmissionAttemptTime,
                              app.status?.terminationTime
                            )}
                          </dd>
                        </div>
                        {app.status?.terminationTime && (
                          <div className="flex gap-2">
                            <dt className="w-40 shrink-0 text-slate-500">Kết thúc</dt>
                            <dd className="text-slate-800">
                              {new Date(app.status.terminationTime).toLocaleString('vi-VN')}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </section>
                  </div>
                </TabsContent>

                <TabsContent value="logs" className="flex-1 flex flex-col overflow-hidden px-6 py-4">
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <p className="text-xs text-slate-500">100 dòng cuối từ driver pod</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogsKey((k) => k + 1)}
                      disabled={isLoadingLogs}
                    >
                      <RefreshCwIcon className={`size-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                      Làm mới
                    </Button>
                  </div>

                  {isLoadingLogs ? (
                    <div className="space-y-1.5">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 w-full" />
                      ))}
                    </div>
                  ) : (
                    <pre className="flex-1 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap break-all">
                      {logsData ?? 'Không có logs.'}
                    </pre>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </div>
    </>
  )
}
