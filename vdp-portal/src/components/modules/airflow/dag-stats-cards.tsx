import { Skeleton } from '@/components/ui/skeleton'
import { ActivityIcon, CircleCheckIcon, CircleXIcon, PauseIcon } from 'lucide-react'

interface DagStats {
  total: number
  active: number
  paused: number
  failedLastRun: number
}

interface DagStatsCardsProps {
  stats: DagStats
  isLoading: boolean
}

export function DagStatsCards({ stats, isLoading }: DagStatsCardsProps) {
  const cards = [
    {
      label: 'Tổng DAGs',
      value: stats.total,
      icon: ActivityIcon,
      iconClass: 'text-slate-500',
      bgClass: 'bg-slate-50',
    },
    {
      label: 'Đang active',
      value: stats.active,
      icon: CircleCheckIcon,
      iconClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      label: 'Tạm dừng',
      value: stats.paused,
      icon: PauseIcon,
      iconClass: 'text-slate-500',
      bgClass: 'bg-slate-50',
    },
    {
      label: 'Lần chạy cuối thất bại',
      value: stats.failedLastRun,
      icon: CircleXIcon,
      iconClass: 'text-red-600',
      bgClass: 'bg-red-50',
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
