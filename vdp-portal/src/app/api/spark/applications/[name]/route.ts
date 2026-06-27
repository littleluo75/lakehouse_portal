import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { getSparkApplication } from '@/lib/services/k8s'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { error } = await validateApiAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { name } = await params
  const { searchParams } = new URL(request.url)
  const namespace = searchParams.get('namespace') ?? 'spark-operator'

  try {
    const app = await getSparkApplication(name, namespace)
    return Response.json({ success: true, data: app })
  } catch (err) {
    return handleApiError(err)
  }
}
