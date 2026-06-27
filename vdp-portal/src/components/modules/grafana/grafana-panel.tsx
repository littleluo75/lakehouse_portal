'use client'

import { useState } from 'react'
import { ExternalLinkIcon } from 'lucide-react'
import type { GrafanaTimeRange } from '@/types/grafana'

interface GrafanaPanelProps {
  dashboardUid: string
  panelId: number
  title: string
  height?: number
  timeRange?: GrafanaTimeRange
}

export function GrafanaPanel({
  dashboardUid,
  panelId,
  title,
  height = 300,
  timeRange = 'now-3h',
}: GrafanaPanelProps) {
  const [iframeError, setIframeError] = useState(false)
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL ?? ''

  const src =
    `${grafanaUrl}/d-solo/${dashboardUid}?` +
    `orgId=1&from=${timeRange}&to=now&panelId=${panelId}&theme=light&kiosk`

  if (iframeError) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 border rounded-lg bg-muted"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">Không tải được panel</p>
        <a
          href={grafanaUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-sm text-blue-500 underline"
        >
          Mở {title} trong Grafana
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b bg-muted/50 text-sm font-medium">{title}</div>
      <iframe
        src={src}
        width="100%"
        height={height}
        frameBorder={0}
        onError={() => setIframeError(true)}
      />
    </div>
  )
}
