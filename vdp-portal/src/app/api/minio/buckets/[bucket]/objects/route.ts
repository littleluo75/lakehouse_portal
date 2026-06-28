import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { listObjects } from '@/lib/services/minio'
import { isBucketAllowed } from '@/config/storage-permissions'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'])
  if (error) return error
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bucket } = await params

    // Kiểm tra bucket có trong allowlist của role này không
    if (!isBucketAllowed(session.user.roles, bucket)) {
      return Response.json(
        { success: false, error: 'Bạn không có quyền truy cập bucket này' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix') ?? ''

    const result = await listObjects(bucket, prefix)

    const folders = (result.CommonPrefixes ?? []).map((p) => ({
      prefix: p.Prefix ?? '',
      name: (p.Prefix ?? '').replace(prefix, '').replace(/\/$/, ''),
    }))

    const files = (result.Contents ?? [])
      .filter((obj) => obj.Key !== prefix && !obj.Key?.endsWith('/'))
      .map((obj) => ({
        key: obj.Key ?? '',
        name: (obj.Key ?? '').split('/').pop() ?? '',
        size: obj.Size ?? 0,
        lastModified: obj.LastModified?.toISOString() ?? new Date().toISOString(),
        etag: obj.ETag ?? '',
      }))

    return Response.json({
      success: true,
      data: { folders, files, prefix },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
