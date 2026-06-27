import { Skeleton } from '@/components/ui/skeleton'
import { PlayCircleIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react'

interface SparkStats {
  running: number
  completed: number
  failed: number
  pending: number
}

interface SparkStatsCardsProps {
  stats: SparkStats
  isLoading: boolean
}

export function SparkStatsCards({ stats, isLoading }: SparkStatsCardsProps) {
  const cards = [
    {
      label: 'Đang chạy',
      value: stats.running,
      icon: PlayCircleIcon,
      iconClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
    },
    {
      label: 'Hoàn thành',
      value: stats.completed,
      icon: CheckCircleIcon,
      iconClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      label: 'Thất bại',
      value: stats.failed,
      icon: XCircleIcon,
      iconClass: 'text-red-600',
      bgClass: 'bg-red-50',
    },
    {
      label: 'Chờ / Đã gửi',
      value: stats.pending,
      icon: ClockIcon,
      iconClass: 'text-yellow-600',
      bgClass: 'bg-yellow-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.label} className="rounded-xl border bg-white p-5 shadow-sm">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-12" />
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className={`rounded-lg p-2 ${card.bgClass}`}>
                  <Icon className={`size-5 ${card.iconClass}`} />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
