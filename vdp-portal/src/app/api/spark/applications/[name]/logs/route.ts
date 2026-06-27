import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { getSparkApplication, getSparkDriverLogs } from '@/lib/services/k8s'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { error } = await validateApiAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { name } = await params
  const { searchParams } = new URL(request.url)
  const namespace = searchParams.get('namespace') ?? 'spark-operator'
  const lines = parseInt(searchParams.get('lines') ?? '100', 10)

  try {
    const app = await getSparkApplication(name, namespace)
    const podName = app.status?.driverInfo?.podName

    if (!podName) {
      return Response.json({ success: true, data: { logs: 'Driver pod chưa sẵn sàng hoặc không tìm thấy.' } })
    }

    const logs = await getSparkDriverLogs(podName, namespace, lines)
    return Response.json({ success: true, data: { logs } })
  } catch (err) {
    return handleApiError(err)
  }
}
