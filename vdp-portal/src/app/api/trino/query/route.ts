import { validateApiAuth } from '@/lib/api-auth'
import { queryTrino } from '@/lib/services/trino'
import { validateSql } from '@/lib/sql-guard'

const ALLOWED_ROLES = ['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'] as const

export async function POST(request: Request) {
  const { session, error } = await validateApiAuth([...ALLOWED_ROLES])
  if (error) return error

  let body: { sql?: unknown; catalog?: unknown; schema?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Request body không hợp lệ' }, { status: 400 })
  }

  const sql = typeof body.sql === 'string' ? body.sql.trim() : ''
  if (!sql) {
    return Response.json({ success: false, error: 'SQL không được để trống' }, { status: 400 })
  }

  const roles = session!.user.roles ?? []
  const validation = validateSql(sql, roles)
  if (!validation.allowed) {
    return Response.json({ success: false, error: validation.reason }, { status: 403 })
  }

  try {
    const result = await queryTrino(sql, {
      username: session!.user.name ?? session!.user.email ?? 'portal-user',
      catalog: typeof body.catalog === 'string' ? body.catalog : undefined,
      schema: typeof body.schema === 'string' ? body.schema : undefined,
    })
    return Response.json({ success: true, data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
