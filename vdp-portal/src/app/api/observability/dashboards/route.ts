import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import { GRAFANA_CONFIG } from '@/config/grafana'
import type { GrafanaDashboard } from '@/types/grafana'

const grafanaClient = createInternalClient({
  baseUrl: GRAFANA_CONFIG.internalUrl,
  authType: 'basic',
  basicCredentials: {
    username: GRAFANA_CONFIG.adminUser,
    password: GRAFANA_CONFIG.adminPassword,
  },
})

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
