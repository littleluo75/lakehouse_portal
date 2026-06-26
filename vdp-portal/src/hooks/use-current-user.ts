'use client'
import { useSession } from 'next-auth/react'
import { hasRole } from '@/lib/utils'
import type { KeycloakRole } from '@/types'

export function useCurrentUser() {
  const { data: session, status } = useSession()

  return {
    user: session?.user ?? null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    hasRole: (roles: KeycloakRole[]) => hasRole(session?.user ?? null, roles),
  }
}
