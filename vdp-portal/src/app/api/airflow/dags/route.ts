import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import type { AirflowDagsResponse } from '@/types/airflow'

const airflowClient = createInternalClient({
  baseUrl: process.env.INTERNAL_AIRFLOW_API ?? '',
  authType: 'bearer',
})

export async function GET() {
  const { session, error } = await validateApiAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  if (error) return error

  try {
    const data = await airflowClient<AirflowDagsResponse>(
      '/dags?limit=100&order_by=dag_id',
      session!
    )
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
