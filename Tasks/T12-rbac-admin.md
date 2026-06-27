# T12 — RBAC hoàn chỉnh + Admin Panel

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01, T02 đã hoàn thành. Các modules T04–T11 đã có (partial ok).

## Mục tiêu
1. Hoàn thiện toàn bộ permission layer: middleware route protection + component-level guard
2. Trang `/admin` — quản lý users và roles qua Keycloak Admin REST API

## Phần 1 — Route Middleware hoàn chỉnh

Cập nhật `src/middleware.ts`:
```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { KeycloakRole } from '@/types'

const ROUTE_PERMISSIONS: Record<string, KeycloakRole[]> = {
  '/workflows':    ['DE', 'Op', 'Admin', 'SuperAdmin'],
  '/catalog':      ['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'],
  '/query':        ['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'],
  '/notebooks':    ['DE', 'DS', 'Admin', 'SuperAdmin'],
  '/storage':      ['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'],
  '/streams':      ['DE', 'Op', 'Admin', 'SuperAdmin'],
  '/jobs':         ['DE', 'Op', 'Admin', 'SuperAdmin'],
  '/observability':['Op', 'Admin', 'SuperAdmin', 'PM'],
  '/admin':        ['SuperAdmin'],
}

export default auth((req) => {
  const path = req.nextUrl.pathname
  const isLoggedIn = !!req.auth
  const isAuthPage = path.startsWith('/login') || path.startsWith('/403')

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && path.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Check route permission
  for (const [route, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path.startsWith(route)) {
      const userRoles = (req.auth?.user?.roles ?? []) as KeycloakRole[]
      const hasAccess = roles.some(r => userRoles.includes(r))
      if (!hasAccess) {
        return NextResponse.redirect(new URL('/403', req.url))
      }
      break
    }
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

## Phần 2 — RoleGuard Component

**`src/components/role-guard.tsx`**:
```typescript
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
```

Dùng trong các module:
```tsx
// Chỉ hiện nút Trigger với Op+
<RoleGuard roles={['Op', 'Admin', 'SuperAdmin']}>
  <Button onClick={handleTrigger}>Trigger DAG</Button>
</RoleGuard>
```

## Phần 3 — Admin Panel (`/admin`)

### Keycloak Admin API (gọi từ BFF dùng Client Credentials)

```typescript
// src/lib/services/keycloak-admin.ts

async function getAdminToken(): Promise<string> {
  const response = await fetch(
    `${process.env.KEYCLOAK_INTERNAL_URL}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_CLIENT_ID!,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
      }),
    }
  )
  const data = await response.json()
  return data.access_token
}

const REALM = process.env.KEYCLOAK_REALM!
const BASE = `${process.env.KEYCLOAK_INTERNAL_URL}/admin/realms/${REALM}`

export async function listUsers() {
  const token = await getAdminToken()
  const res = await fetch(`${BASE}/users?max=100`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function getUserRoles(userId: string) {
  const token = await getAdminToken()
  const res = await fetch(`${BASE}/users/${userId}/role-mappings/realm`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

export async function assignRole(userId: string, roleId: string, roleName: string) {
  const token = await getAdminToken()
  await fetch(`${BASE}/users/${userId}/role-mappings/realm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ id: roleId, name: roleName }]),
  })
}

export async function removeRole(userId: string, roleId: string, roleName: string) {
  const token = await getAdminToken()
  await fetch(`${BASE}/users/${userId}/role-mappings/realm`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([{ id: roleId, name: roleName }]),
  })
}
```

**Lưu ý:** Keycloak client `vdp-portal` cần được grant role `realm-management` → `view-users` + `manage-users` trong Keycloak console. Ghi chú này vào PR-1 của infra team.

### BFF API Routes
```
GET    /api/admin/users
GET    /api/admin/users/[id]/roles
POST   /api/admin/users/[id]/roles      Body: { roleId, roleName }
DELETE /api/admin/users/[id]/roles      Body: { roleId, roleName }
```

Tất cả routes validate `SuperAdmin` role trước.

### UI — Trang `/admin`

**User List Table:**
Cột: Avatar | Tên | Username | Email | Roles (badge list) | Actions

**Role Management Dialog** (click "Sửa roles" của user):
- Hiển thị tất cả roles hiện tại (checkboxes)
- Roles khả dụng: `SuperAdmin`, `Admin`, `Op`, `PM`, `DE`, `DS`, `DA`, `BA`, `Viewer`
- Check/uncheck → gọi POST/DELETE
- Không cho phép xóa role `SuperAdmin` của chính mình (check `session.user.id !== userId`)

**Note:** Admin không thể đổi role của chính mình thành thấp hơn.

## Kiểm tra hoàn thành
- [x] Middleware redirect đúng cho tất cả routes trong bảng
- [x] `<RoleGuard>` ẩn/hiện đúng trong ít nhất T04 (nút Trigger) và T06 (nút nguy hiểm)
- [x] Admin panel list được users từ Keycloak
- [x] Assign role → user thấy thay đổi ngay sau khi login lại
- [x] Remove role hoạt động
- [x] Không thể xóa role SuperAdmin của chính mình
- [x] `pnpm build` không lỗi
