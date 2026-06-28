# T02 — Authentication với Keycloak OIDC

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01 đã hoàn thành.

## Mục tiêu
Tích hợp Auth.js v5 với Keycloak realm `lakehouse`. Sau task này, toàn bộ route trong `(dashboard)/` được bảo vệ, session chứa đầy đủ thông tin user + roles từ Keycloak.

## Thông số Keycloak

```
Realm:         lakehouse
Issuer:        https://keycloak.lakehouse.local/realms/lakehouse
Client ID:     vdp-portal
Client Secret: vdp-portal-secret-key-2026
OIDC Discovery: https://keycloak.lakehouse.local/realms/lakehouse/.well-known/openid-configuration
```

**Lưu ý:** Keycloak dùng self-signed cert từ CA `lakehouse-ca`. Trong môi trường dev cần set `NODE_TLS_REJECT_UNAUTHORIZED=0` hoặc import cert. Trong production (chạy trong cluster) gọi internal URL `http://keycloak.keycloak.svc.cluster.local:8080` không cần TLS.

## Các bước thực hiện

### Bước 1: Cấu hình Auth.js (`src/lib/auth.ts`)

```typescript
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
      // Lần đầu đăng nhập: lưu tokens và roles từ Keycloak
      if (account && profile) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at ?? 0
        
        // Extract roles từ Keycloak token claims
        // Keycloak gửi realm_access.roles trong JWT
        const keycloakProfile = profile as Record<string, unknown>
        const realmAccess = keycloakProfile.realm_access as { roles?: string[] }
        token.roles = (realmAccess?.roles ?? []) as KeycloakRole[]
      }
      
      // Token refresh khi sắp hết hạn (còn < 60 giây)
      if (Date.now() < (token.expiresAt as number) * 1000 - 60000) {
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
    maxAge: 8 * 60 * 60, // 8 giờ
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
```

### Bước 2: API Routes cho Auth.js

**`src/app/api/auth/[...nextauth]/route.ts`**:
```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

### Bước 3: Provider cho React Query + Session

**`src/components/providers.tsx`**:
```typescript
'use client'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30 * 1000, retry: 1 },
    },
  }))
  
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}
```

Wrap vào `src/app/layout.tsx`.

### Bước 4: Trang Login

**`src/app/(auth)/login/page.tsx`**:
- Hiển thị logo VDP Portal + tên "VNPT Data Platform"
- Nút "Đăng nhập bằng VNPT SSO" → gọi `signIn('keycloak')`
- Subtitle: "Đăng nhập bằng tài khoản VNPT của bạn"
- Nếu có `?error=` param thì hiển thị thông báo lỗi

### Bước 5: Hook useCurrentUser

**`src/hooks/use-current-user.ts`**:
```typescript
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
```

### Bước 6: Server-side auth helper

**`src/lib/require-auth.ts`**:
```typescript
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
```

### Bước 7: API Route auth helper

**`src/lib/api-auth.ts`**:
```typescript
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
```

### Bước 8: Trang 403

**`src/app/403/page.tsx`** — Hiển thị "Bạn không có quyền truy cập trang này" với nút quay về trang chủ.

## Kiểm tra hoàn thành

- [x] Truy cập `http://localhost:3000` → redirect về `/login`
- [x] Click "Đăng nhập bằng VNPT SSO" → redirect sang Keycloak login page
- [x] Sau đăng nhập thành công → redirect về `/` với session hợp lệ
- [x] `session.user.roles` chứa đúng roles từ Keycloak
- [x] Token refresh tự động khi sắp hết hạn
- [x] Route `/admin` redirect về `/403` nếu user không có role `SuperAdmin`
- [x] Logout xóa session và redirect về `/login`

## Trạng thái
**Hoàn thành:** 2026-06-28
**P0 fixes liên quan:** P0-T5 (Token refresh error handling)
**Ghi chú:** Đã xác minh thực tế triển khai trên production codebase.
