import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { listBuckets } from '@/lib/services/minio'

export async function GET() {
  const { error } = await validateApiAuth(['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'])
  if (error) return error

  try {
    const result = await listBuckets()
    const buckets = (result.Buckets ?? []).map((b) => ({
      name: b.Name ?? '',
      creationDate: b.CreationDate?.toISOString() ?? new Date().toISOString(),
    }))

    return Response.json({ success: true, data: buckets })
  } catch (err) {
    return handleApiError(err)
  }
}
