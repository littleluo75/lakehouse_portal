import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasRole } from '@/lib/utils'
import type { KeycloakRole } from '@/types'

export async function requireAuth(allowedRoles?: KeycloakRole[]) {
  const session = await auth()
  if (!session) redirect('/login')

  if (allowedRoles && !hasRole(session.user, allowedRoles)) {
    redirect('/403')
  }

  return session
}
