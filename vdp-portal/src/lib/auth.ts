import NextAuth from 'next-auth'
import Keycloak from 'next-auth/providers/keycloak'
import type { IUser, KeycloakRole } from '@/types'

declare module 'next-auth' {
  interface Session {
    user: IUser
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token as string
        token.expiresAt = account.expires_at ?? 0

        const keycloakProfile = profile as Record<string, unknown>
        const realmAccess = keycloakProfile.realm_access as { roles?: string[] }
        token.roles = (realmAccess?.roles ?? []) as KeycloakRole[]
      }

      const expiresAt = (token.expiresAt as number | undefined) ?? 0
      if (Date.now() < expiresAt * 1000 - 60000) {
        return token
      }

      return await refreshAccessToken(token)
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.expiresAt = token.expiresAt as number
      session.user = {
        ...session.user,
        id: token.sub ?? '',
        roles: (token.roles as KeycloakRole[]) ?? [],
        accessToken: token.accessToken as string,
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
})

async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const response = await fetch(
      `${process.env.KEYCLOAK_INTERNAL_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.KEYCLOAK_CLIENT_ID!,
          client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken as string,
        }),
      }
    )

    if (!response.ok) throw new Error('Failed to refresh token')

    const refreshed = await response.json()
    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
    }
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}
