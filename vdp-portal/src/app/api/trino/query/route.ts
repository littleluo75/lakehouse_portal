import { validateApiAuth } from '@/lib/api-auth'
import { queryTrino } from '@/lib/services/trino'

const ALLOWED_ROLES = ['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'] as const
const SELECT_ONLY_ROLES = ['DA']
const WRITE_KEYWORDS = /^\s*(DROP|TRUNCATE|DELETE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE)\b/i

function validateQuery(sql: string, roles: string[]): { allowed: boolean; reason?: string } {
  const isSelectOnly =
    roles.some((r) => SELECT_ONLY_ROLES.includes(r)) &&
    !roles.some((r) => ['DE', 'DS', 'Admin', 'SuperAdmin'].includes(r))

  if (isSelectOnly && WRITE_KEYWORDS.test(sql.trim())) {
    return { allowed: false, reason: 'Role DA chỉ được phép thực thi câu lệnh SELECT' }
  }
  return { allowed: true }
}

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
  const validation = validateQuery(sql, roles)
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
