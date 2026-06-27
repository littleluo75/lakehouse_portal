import { validateApiAuth } from '@/lib/api-auth'
import type { ServiceHealth } from '@/types/grafana'

const SERVICES: { name: string; url: string }[] = [
  { name: 'Airflow', url: `${process.env.INTERNAL_AIRFLOW_API}/health` },
  { name: 'Trino', url: `${process.env.INTERNAL_TRINO_URL}/v1/info` },
  { name: 'OpenMetadata', url: `${process.env.INTERNAL_OPENMETADATA}/system/status` },
  { name: 'MinIO', url: `${process.env.INTERNAL_MINIO_ENDPOINT}/minio/health/live` },
  // JupyterHub hub/api/../hub/health resolves to hub/health
  { name: 'JupyterHub', url: `${process.env.INTERNAL_JUPYTERHUB?.replace('/hub/api', '')}/hub/health` },
  { name: 'Nessie', url: `${process.env.INTERNAL_NESSIE_API?.replace('/api/v2', '')}/q/health` },
]

const TIMEOUT_MS = 5000
const DEGRADED_LATENCY_MS = 2000

async function checkService(name: string, url: string): Promise<ServiceHealth> {
  const start = Date.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })
    const latencyMs = Date.now() - start
    clearTimeout(timeoutId)

    if (!res.ok) {
      return { name, status: 'degraded', latencyMs, error: `HTTP ${res.status}` }
    }

    return {
      name,
      status: latencyMs > DEGRADED_LATENCY_MS ? 'degraded' : 'healthy',
      latencyMs,
    }
  } catch (err) {
    clearTimeout(timeoutId)
    const latencyMs = Date.now() - start
    const isTimeout = (err as Error).name === 'AbortError'
    return {
      name,
      status: 'down',
      latencyMs,
      error: isTimeout ? 'Timeout' : (err as Error).message,
    }
  }
}

export async function GET() {
  const { error } = await validateApiAuth(['Op', 'PM', 'Admin', 'SuperAdmin'])
  if (error) return error

  const results = await Promise.allSettled(
    SERVICES.map(s => checkService(s.name, s.url))
  )

  const data: ServiceHealth[] = results.map((result, i) => {
    if (result.status === 'fulfilled') return result.value
    return { name: SERVICES[i].name, status: 'down' as const, latencyMs: 0, error: 'Check failed' }
  })

  return Response.json({ success: true, data })
}
