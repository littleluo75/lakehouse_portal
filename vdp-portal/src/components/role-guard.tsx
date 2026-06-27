'use client'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { KeycloakRole } from '@/types'

interface RoleGuardProps {
  roles: KeycloakRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ roles, children, fallback = null }: RoleGuardProps) {
  const { hasRole, isLoading } = useCurrentUser()
  if (isLoading) return null
  if (!hasRole(roles)) return <>{fallback}</>
  return <>{children}</>
}
