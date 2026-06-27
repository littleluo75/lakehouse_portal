import { cn } from '@/lib/utils'
import type { RunState } from '@/types/airflow'

const stateConfig: Record<RunState, { label: string; className: string }> = {
  success: { label: 'Thành công', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Thất bại', className: 'bg-red-100 text-red-700' },
  running: { label: 'Đang chạy', className: 'bg-yellow-100 text-yellow-700' },
  queued: { label: 'Hàng chờ', className: 'bg-blue-100 text-blue-700' },
}

interface RunStateBadgeProps {
  state: RunState
  className?: string
}

export function RunStateBadge({ state, className }: RunStateBadgeProps) {
  const config = stateConfig[state] ?? { label: state, className: 'bg-slate-100 text-slate-600' }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {state === 'running' && (
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-yellow-500" />
      )}
      {config.label}
    </span>
  )
}

interface DagStatusBadgeProps {
  isPaused: boolean
  isActive: boolean
  className?: string
}

export function DagStatusBadge({ isPaused, isActive, className }: DagStatusBadgeProps) {
  if (isPaused) {
    return (
      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500', className)}>
        Tạm dừng
      </span>
    )
  }
  if (!isActive) {
    return (
      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-400', className)}>
        Không active
      </span>
    )
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700', className)}>
      Active
    </span>
  )
}
