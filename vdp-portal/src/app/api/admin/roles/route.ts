import { validateApiAuth } from '@/lib/api-auth'
import { listRealmRoles } from '@/lib/services/keycloak-admin'
import { handleApiError } from '@/lib/api-error-handler'

const PORTAL_ROLES = new Set([
  'SuperAdmin', 'Admin', 'Op', 'PM', 'DE', 'DS', 'DA', 'BA', 'Viewer',
])

export async function GET() {
  const { error } = await validateApiAuth(['SuperAdmin'])
  if (error) return error

  try {
    const roles = await listRealmRoles()
    const filtered = roles.filter((r) => PORTAL_ROLES.has(r.name))
    return Response.json({ success: true, data: filtered })
  } catch (err) {
    return handleApiError(err)
  }
}
