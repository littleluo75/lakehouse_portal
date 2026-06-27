import type { SparkAppState } from '@/types/spark'

const STATE_CONFIG: Record<SparkAppState, { label: string; className: string }> = {
  RUNNING: { label: 'Đang chạy', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'Thất bại', className: 'bg-red-100 text-red-700' },
  SUBMITTED: { label: 'Đã gửi', className: 'bg-yellow-100 text-yellow-700' },
  PENDING: { label: 'Chờ', className: 'bg-slate-100 text-slate-600' },
  UNKNOWN: { label: 'Không rõ', className: 'bg-slate-100 text-slate-500' },
}

export function SparkStateBadge({ state }: { state: SparkAppState }) {
  const config = STATE_CONFIG[state] ?? STATE_CONFIG.UNKNOWN
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
