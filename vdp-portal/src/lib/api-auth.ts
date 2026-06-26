import { auth } from '@/lib/auth'
import type { KeycloakRole } from '@/types'
import { hasRole } from '@/lib/utils'

export async function validateApiAuth(allowedRoles?: KeycloakRole[]) {
  const session = await auth()

  if (!session) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (allowedRoles && !hasRole(session.user, allowedRoles)) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { session }
}
