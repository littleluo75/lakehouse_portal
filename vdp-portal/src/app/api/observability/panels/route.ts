import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { grafanaClient } from '@/lib/services'
import type { GrafanaDashboardDetail } from '@/types/grafana'

export async function GET(request: Request) {
  const { error } = await validateApiAuth(['Op', 'PM', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const uid = searchParams.get('uid')

  if (!uid) {
    return Response.json({ success: false, error: 'uid parameter is required' }, { status: 400 })
  }

  try {
    const data = await grafanaClient<GrafanaDashboardDetail>(
      `/api/dashboards/uid/${uid}`,
      null
    )
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
