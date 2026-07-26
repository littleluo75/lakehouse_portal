import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OperationStatus } from '@/lib/ba-draft/fixtures/types'
import { cn } from '@/lib/utils'

export function LoadingState({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div data-testid="loading-state" className="flex items-center justify-center gap-2 py-16 text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div data-testid="error-state" className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <AlertTriangle className="h-6 w-6 text-red-500" />
      <p className="text-sm text-red-600 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-blue-600 underline mt-1">
          Thử lại
        </button>
      )}
    </div>
  )
}

export function EmptyState({ label = 'Chưa có dữ liệu.' }: { label?: string }) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
      <Inbox className="h-6 w-6" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

const OPERATION_STATUS_STYLE: Record<OperationStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  running: 'bg-blue-100 text-blue-700',
  succeeded: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  partial: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-slate-200 text-slate-500',
}

const OPERATION_STATUS_LABEL: Record<OperationStatus, string> = {
  pending: 'Đang chờ',
  running: 'Đang chạy',
  succeeded: 'Thành công',
  failed: 'Thất bại',
  partial: 'Một phần',
  cancelled: 'Đã hủy',
}

export function OperationStatusBadge({ status, className }: { status: OperationStatus; className?: string }) {
  return (
    <Badge data-testid="operation-status" className={cn(OPERATION_STATUS_STYLE[status], className)}>
      {OPERATION_STATUS_LABEL[status]}
    </Badge>
  )
}
