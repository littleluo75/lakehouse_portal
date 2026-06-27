import { validateApiAuth } from '@/lib/api-auth'
import { listTrinoTables } from '@/lib/services/trino'

export async function GET(request: Request) {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { searchParams } = new URL(request.url)
  const catalog = searchParams.get('catalog')
  const schema = searchParams.get('schema')
  if (!catalog || !schema) {
    return Response.json(
      { success: false, error: 'Tham số catalog và schema là bắt buộc' },
      { status: 400 }
    )
  }

  try {
    const tables = await listTrinoTables(
      catalog,
      schema,
      session!.user.name ?? session!.user.email ?? 'portal-user'
    )
    return Response.json({ success: true, data: tables })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
