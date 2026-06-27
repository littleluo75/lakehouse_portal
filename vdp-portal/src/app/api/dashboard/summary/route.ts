import { validateApiAuth } from '@/lib/api-auth'
import { listSparkApplications } from '@/lib/services/k8s'
import { getMinioStats } from '@/lib/services/minio'
import { hasRole } from '@/lib/utils'
import type { SparkApplication } from '@/types/spark'
import type { DashboardHealth, RecentDagRun, RecentSparkJob } from '@/types/dashboard'

const TIMEOUT_MS = 5000
const DEGRADED_LATENCY_MS = 500

async function checkService(name: string, url: string): Promise<DashboardHealth> {
  if (!url || url.includes('undefined')) {
    return { name, status: 'down', latencyMs: null, error: 'Not configured' }
  }
  const start = Date.now()
  const controller = new AbortController()
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    const latencyMs = Date.now() - start
    clearTimeout(tid)
    if (!res.ok) return { name, status: 'degraded', latencyMs, error: `HTTP ${res.status}` }
    return { name, status: latencyMs > DEGRADED_LATENCY_MS ? 'degraded' : 'healthy', latencyMs }
  } catch (err) {
    clearTimeout(tid)
    const latencyMs = Date.now() - start
    const isTimeout = (err as Error).name === 'AbortError'
    return { name, status: 'down', latencyMs, error: isTimeout ? 'Timeout' : (err as Error).message }
  }
}

export async function GET() {
  const { session, error } = await validateApiAuth([])
  if (error) return error

  const isAdmin = hasRole(session!.user, ['Admin', 'SuperAdmin'])
  const canViewActivity = hasRole(session!.user, ['DE', 'Op', 'Admin', 'SuperAdmin'])

  const airflowBase = process.env.INTERNAL_AIRFLOW_API ?? ''
  const jupyterBase = process.env.INTERNAL_JUPYTERHUB ?? ''

  const [airflowResult, sparkResult, minioResult, jupyterResult] = await Promise.allSettled([
    fetch(`${airflowBase}/dags?is_active=true&limit=1`, {
      headers: { Authorization: `Bearer ${session!.accessToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
      .then((r) => r.json())
      .then((d) => (d as { total_entries: number }).total_entries),

    listSparkApplications().then(
      (apps) => (apps as SparkApplication[]).filter((a) => a.status?.applicationState.state === 'RUNNING').length
    ),

    getMinioStats(),

    isAdmin
      ? fetch(`${jupyterBase}/users`, {
          headers: { Authorization: `Bearer ${session!.accessToken}` },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
          .then((r) => r.json())
          .then((users: unknown[]) => users.filter((u) => (u as { server?: unknown }).server).length)
      : Promise.resolve(null),
  ])

  const HEALTH_SERVICES = [
    { name: 'Airflow', url: `${airflowBase}/health` },
    { name: 'Trino', url: `${process.env.INTERNAL_TRINO_URL ?? ''}/v1/info` },
    { name: 'OpenMetadata', url: `${process.env.INTERNAL_OPENMETADATA ?? ''}/system/status` },
    { name: 'MinIO', url: `${process.env.INTERNAL_MINIO_ENDPOINT ?? ''}/minio/health/live` },
    { name: 'JupyterHub', url: jupyterBase.replace('/hub/api', '/hub/health') },
    { name: 'StarRocks', url: process.env.STARROCKS_FE_HOST ? `http://${process.env.STARROCKS_FE_HOST}:8030/api/health` : '' },
  ]

  const healthResults = await Promise.allSettled(
    HEALTH_SERVICES.map((s) => checkService(s.name, s.url))
  )

  const health: DashboardHealth[] = healthResults.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { name: HEALTH_SERVICES[i].name, status: 'down', latencyMs: null }
  )

  let recentDagRuns: RecentDagRun[] | null = null
  let recentSparkJobs: RecentSparkJob[] | null = null

  if (canViewActivity) {
    const [dagRunsResult, sparkJobsResult] = await Promise.allSettled([
      fetch(`${airflowBase}/dags/~/dagRuns?order_by=-start_date&limit=5`, {
        headers: { Authorization: `Bearer ${session!.accessToken}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
        .then((r) => r.json())
        .then((d) => {
          const resp = d as { dag_runs?: Array<{ dag_id: string; dag_run_id: string; state: string; start_date: string | null }> }
          return (resp.dag_runs ?? []).map<RecentDagRun>((run) => ({
            dagId: run.dag_id,
            runId: run.dag_run_id,
            state: run.state,
            startDate: run.start_date,
          }))
        }),

      listSparkApplications().then((apps) =>
        (apps as SparkApplication[])
          .sort((a, b) =>
            new Date(b.metadata.creationTimestamp).getTime() -
            new Date(a.metadata.creationTimestamp).getTime()
          )
          .slice(0, 5)
          .map<RecentSparkJob>((app) => ({
            name: app.metadata.name,
            state: app.status?.applicationState.state ?? 'UNKNOWN',
            creationTimestamp: app.metadata.creationTimestamp,
          }))
      ),
    ])

    recentDagRuns = dagRunsResult.status === 'fulfilled' ? dagRunsResult.value : null
    recentSparkJobs = sparkJobsResult.status === 'fulfilled' ? sparkJobsResult.value : null
  }

  return Response.json({
    success: true,
    data: {
      stats: {
        activeDags: airflowResult.status === 'fulfilled' ? airflowResult.value : null,
        runningSparkJobs: sparkResult.status === 'fulfilled' ? sparkResult.value : null,
        storageUsed: minioResult.status === 'fulfilled' ? minioResult.value : null,
        activeNotebooks: jupyterResult.status === 'fulfilled' ? jupyterResult.value : null,
      },
      health,
      activity: { recentDagRuns, recentSparkJobs },
    },
  })
}
