export interface GrafanaDashboard {
  id: number
  uid: string
  title: string
  uri: string
  url: string
  type: string
  tags: string[]
  isStarred: boolean
}

export interface GrafanaPanel {
  id: number
  title: string
  type: string
  description?: string
}

export interface GrafanaDashboardDetail {
  dashboard: {
    id: number
    uid: string
    title: string
    panels: GrafanaPanel[]
  }
  meta: {
    slug: string
    url: string
  }
}

export interface ServiceHealth {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs: number
  error?: string
}

export type GrafanaTimeRange = 'now-1h' | 'now-3h' | 'now-24h' | 'now-7d'
