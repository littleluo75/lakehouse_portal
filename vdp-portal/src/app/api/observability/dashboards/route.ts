import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { grafanaClient } from '@/lib/services'
import type { GrafanaDashboard } from '@/types/grafana'

export async function GET() {
  const { error } = await validateApiAuth(['Op', 'PM', 'Admin', 'SuperAdmin'])
  if (error) return error

  try {
    const data = await grafanaClient<GrafanaDashboard[]>(
      '/api/search?type=dash-db',
      null
    )
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
