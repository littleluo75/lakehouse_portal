import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import type { DAG } from '@/types/airflow'

const airflowClient = createInternalClient({
  baseUrl: process.env.INTERNAL_AIRFLOW_API ?? '',
  authType: 'bearer',
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ dagId: string }> }
) {
  const { session, error } = await validateApiAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { dagId } = await params

  try {
    const data = await airflowClient<DAG>(`/dags/${dagId}`, session!)
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
