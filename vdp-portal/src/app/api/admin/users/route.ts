import { validateApiAuth } from '@/lib/api-auth'
import { listUsers } from '@/lib/services/keycloak-admin'
import { handleApiError } from '@/lib/api-error-handler'

export async function GET() {
  const { error } = await validateApiAuth(['SuperAdmin'])
  if (error) return error

  try {
    const users = await listUsers()
    return Response.json({ success: true, data: users })
  } catch (err) {
    return handleApiError(err)
  }
}
