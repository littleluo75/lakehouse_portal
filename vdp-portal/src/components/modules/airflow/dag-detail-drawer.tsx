'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RunStateBadge } from './status-badge'
import { XIcon, ExternalLinkIcon, PlayIcon } from 'lucide-react'
import type { DAG, DAGRun } from '@/types/airflow'

interface DagDetailDrawerProps {
  dag: DAG | null
  runs: DAGRun[]
  isLoadingRuns: boolean
  open: boolean
  canManage: boolean
  onClose: () => void
  onTrigger: (dag: DAG) => void
}

export function DagDetailDrawer({
  dag,
  runs,
  isLoadingRuns,
  open,
  canManage,
  onClose,
  onTrigger,
}: DagDetailDrawerProps) {
  const airflowUrl = process.env.NEXT_PUBLIC_AIRFLOW_URL ?? 'https://airflow.lakehouse.local'

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-screen w-[520px] overflow-y-auto bg-white shadow-xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {dag && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div className="flex-1 space-y-1 pr-4">
                <h2 className="font-mono text-base font-semibold text-slate-900 break-all">
                  {dag.dag_id}
                </h2>
                {dag.description && (
                  <p className="text-sm text-slate-500">{dag.description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 border-b px-6 py-4 text-sm">
              <div>
                <p className="text-xs font-medium text-slate-400">Owners</p>
                <p className="mt-0.5 text-slate-700">{dag.owners.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Lịch chạy</p>
                <p className="mt-0.5 font-mono text-slate-700">{dag.schedule_interval ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Tags</p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {dag.tags.length > 0 ? (
                    dag.tags.map((t) => (
                      <span
                        key={t.name}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {t.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Lần chạy tiếp theo</p>
                <p className="mt-0.5 text-slate-700">
                  {dag.next_dagrun
                    ? new Date(dag.next_dagrun).toLocaleString('vi-VN')
                    : '—'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 border-b px-6 py-3">
              {canManage && (
                <Button size="sm" onClick={() => onTrigger(dag)}>
                  <PlayIcon className="size-3.5" />
                  Trigger DAG
                </Button>
              )}
              <a
                href={`${airflowUrl}/dags/${dag.dag_id}/graph`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLinkIcon className="size-3.5" />
                  Mở trong Airflow
                </Button>
              </a>
            </div>

            {/* Run history */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                Lịch sử chạy (10 gần nhất)
              </h3>

              {isLoadingRuns ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : runs.length === 0 ? (
                <p className="text-sm text-slate-400">Chưa có lần chạy nào.</p>
              ) : (
                <div className="space-y-2">
                  {runs.map((run) => (
                    <div
                      key={run.dag_run_id}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-500">
                          {run.dag_run_id}
                        </span>
                        <RunStateBadge state={run.state} />
                      </div>
                      <div className="mt-1 flex gap-4 text-xs text-slate-400">
                        <span>
                          Execution:{' '}
                          {new Date(run.execution_date).toLocaleString('vi-VN')}
                        </span>
                        {run.start_date && (
                          <span>
                            Bắt đầu:{' '}
                            {new Date(run.start_date).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
