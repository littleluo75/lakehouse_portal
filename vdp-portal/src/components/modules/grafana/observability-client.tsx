'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GrafanaPanel } from './grafana-panel'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ExternalLinkIcon, RefreshCwIcon } from 'lucide-react'
import { GRAFANA_CONFIG } from '@/config/grafana'
import type { ServiceHealth, GrafanaTimeRange } from '@/types/grafana'

const TIME_RANGES: { label: string; value: GrafanaTimeRange }[] = [
  { label: '1h', value: 'now-1h' },
  { label: '3h', value: 'now-3h' },
  { label: '24h', value: 'now-24h' },
  { label: '7d', value: 'now-7d' },
]

const STATUS_CONFIG = {
  healthy: { dot: 'bg-green-500', text: 'text-green-700', label: 'Healthy' },
  degraded: { dot: 'bg-yellow-500', text: 'text-yellow-700', label: 'Degraded' },
  down: { dot: 'bg-red-500', text: 'text-red-700', label: 'Down' },
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  const cfg = STATUS_CONFIG[service.status]
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
          <span className="text-sm font-medium">{service.name}</span>
        </div>
        <div className="text-right">
          <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
          <p className="text-xs text-muted-foreground">{service.latencyMs}ms</p>
        </div>
      </CardContent>
    </Card>
  )
}

function GrafanaFallback() {
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL ?? ''
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 flex items-center justify-between">
      <p className="text-sm text-yellow-800">
        Grafana panel embed chưa khả dụng — PR-3 chưa được merge hoặc iframe bị block.
      </p>
      <a href={grafanaUrl} target="_blank" rel="noreferrer">
        <Button variant="outline" size="sm" className="gap-1">
          Mở Grafana Dashboard
          <ExternalLinkIcon className="h-3 w-3" />
        </Button>
      </a>
    </div>
  )
}

const { uid, panels } = GRAFANA_CONFIG.dashboards.lakehouse
const PANELS = [
  { key: 'cpuUsage', id: panels.cpuUsage, title: 'CPU Usage' },
  { key: 'memoryUsage', id: panels.memoryUsage, title: 'Memory Usage' },
  { key: 'sparkJobs', id: panels.sparkJobs, title: 'Spark Jobs Status' },
  { key: 'airflowHealth', id: panels.airflowHealth, title: 'Airflow DAG Health' },
  { key: 'storageUsage', id: panels.storageUsage, title: 'MinIO Storage' },
  { key: 'networkIO', id: panels.networkIO, title: 'Network I/O' },
] as const

const grafanaNotConfigured = uid === 'FILL_FROM_API' || panels.cpuUsage === 0

export function ObservabilityClient() {
  const [timeRange, setTimeRange] = useState<GrafanaTimeRange>('now-3h')

  const { data: healthData, isLoading: healthLoading, refetch } = useQuery<ServiceHealth[]>({
    queryKey: ['observability', 'health'],
    queryFn: async () => {
      const res = await fetch('/api/observability/health')
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      return json.data as ServiceHealth[]
    },
    refetchInterval: 60_000,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Observability</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            {TIME_RANGES.map(tr => (
              <button
                key={tr.value}
                onClick={() => setTimeRange(tr.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  timeRange === tr.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {tr.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
            <RefreshCwIcon className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform Health Row */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Platform Health
        </h2>
        {healthLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(healthData ?? []).map(svc => (
              <ServiceCard key={svc.name} service={svc} />
            ))}
          </div>
        )}
      </div>

      {/* Grafana Panels */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Metrics
        </h2>
        {grafanaNotConfigured ? (
          <GrafanaFallback />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {PANELS.map(panel => (
              <GrafanaPanel
                key={panel.key}
                dashboardUid={uid}
                panelId={panel.id}
                title={panel.title}
                timeRange={timeRange}
                height={300}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
