import { validateApiAuth } from '@/lib/api-auth'
import { listTrinoCatalogs } from '@/lib/services/trino'

export async function GET() {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'])
  if (error) return error

  try {
    const catalogs = await listTrinoCatalogs(
      session!.user.name ?? session!.user.email ?? 'portal-user'
    )
    return Response.json({ success: true, data: catalogs })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
