import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { getDownloadUrl } from '@/lib/services/minio'
import { isBucketAllowed } from '@/config/storage-permissions'

// Presigned URL hết hạn sau 15 phút — đủ dùng, không quá dài
const PRESIGNED_TTL_SECONDS = 900

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bucket: string }> }
) {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'Op', 'Admin', 'SuperAdmin'])
  if (error) return error
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bucket } = await params
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    // Validate input
    if (!key) {
      return Response.json({ success: false, error: 'Thiếu tham số key' }, { status: 400 })
    }

    // Chặn path traversal
    if (key.includes('..') || key.startsWith('/')) {
      return Response.json({ success: false, error: 'Đường dẫn không hợp lệ' }, { status: 400 })
    }

    // Kiểm tra bucket có trong allowlist của role này không
    if (!isBucketAllowed(session.user.roles, bucket)) {
      return Response.json(
        { success: false, error: 'Bạn không có quyền truy cập bucket này' },
        { status: 403 }
      )
    }

    const url = await getDownloadUrl(bucket, key, PRESIGNED_TTL_SECONDS)

    return Response.json({
      success: true,
      data: { url, expiresIn: PRESIGNED_TTL_SECONDS },
    })
  } catch (err) {
    return handleApiError(err)
  }
}
