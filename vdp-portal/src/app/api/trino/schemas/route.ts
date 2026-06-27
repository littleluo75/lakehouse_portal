import { validateApiAuth } from '@/lib/api-auth'
import { listTrinoSchemas } from '@/lib/services/trino'

export async function GET(request: Request) {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const catalog = searchParams.get('catalog')
  if (!catalog) {
    return Response.json({ success: false, error: 'Tham số catalog là bắt buộc' }, { status: 400 })
  }

  try {
    const schemas = await listTrinoSchemas(
      catalog,
      session!.user.name ?? session!.user.email ?? 'portal-user'
    )
    return Response.json({ success: true, data: schemas })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
