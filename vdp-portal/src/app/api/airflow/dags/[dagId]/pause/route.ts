import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import type { DAG } from '@/types/airflow'

const airflowClient = createInternalClient({
  baseUrl: process.env.INTERNAL_AIRFLOW_API ?? '',
  authType: 'bearer',
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ dagId: string }> }
) {
  const { session, error } = await validateApiAuth(['Op', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { dagId } = await params

  const body = await req.json() as { is_paused: boolean }
  if (typeof body.is_paused !== 'boolean') {
    return Response.json({ success: false, error: 'is_paused must be boolean' }, { status: 400 })
  }

  try {
    const data = await airflowClient<DAG>(
      `/dags/${dagId}`,
      session!,
      { method: 'PATCH', body: { is_paused: body.is_paused } }
    )
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
