export interface MinioStats {
  bucketCount: number
}

export interface DashboardHealth {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs: number | null
  error?: string
}

export interface RecentDagRun {
  dagId: string
  runId: string
  state: string
  startDate: string | null
}

export interface RecentSparkJob {
  name: string
  state: string
  creationTimestamp: string
}

export interface DashboardStats {
  activeDags: number | null
  runningSparkJobs: number | null
  storageUsed: MinioStats | null
  activeNotebooks: number | null
}

export interface DashboardActivity {
  recentDagRuns: RecentDagRun[] | null
  recentSparkJobs: RecentSparkJob[] | null
}

export interface ClusterStats {
  connected: boolean
  nodeCount: number | null
  cpuCapacity: string | null
  memoryCapacity: string | null
}

export interface DashboardSummary {
  stats: DashboardStats
  health: DashboardHealth[]
  activity: DashboardActivity
  clusterStats?: ClusterStats | null
}
