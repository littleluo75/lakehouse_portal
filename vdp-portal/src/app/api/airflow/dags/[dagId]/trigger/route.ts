import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import type { DAGRun } from '@/types/airflow'

const airflowClient = createInternalClient({
  baseUrl: process.env.INTERNAL_AIRFLOW_API ?? '',
  authType: 'bearer',
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ dagId: string }> }
) {
  const { session, error } = await validateApiAuth(['Op', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { dagId } = await params

  let conf: Record<string, unknown> = {}
  try {
    const body = await req.json() as { conf?: Record<string, unknown> }
    conf = body.conf ?? {}
  } catch {
    // conf optional — empty body is fine
  }

  try {
    const data = await airflowClient<DAGRun>(
      `/dags/${dagId}/dagRuns`,
      session!,
      { method: 'POST', body: { conf } }
    )
    return Response.json({ success: true, data }, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
