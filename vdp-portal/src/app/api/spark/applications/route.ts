import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { listSparkApplications } from '@/lib/services/k8s'
import type { SparkApplication } from '@/types/spark'

export async function GET(request: Request) {
  const { error } = await validateApiAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const namespace = searchParams.get('namespace') ?? 'spark-operator'
  const stateFilter = searchParams.get('state')

  try {
    let items: SparkApplication[] = await listSparkApplications(namespace)

    if (stateFilter) {
      items = items.filter(
        (app) => (app.status?.applicationState?.state ?? 'UNKNOWN') === stateFilter
      )
    }

    return Response.json({ success: true, data: { items, total: items.length } })
  } catch (err) {
    return handleApiError(err)
  }
}
