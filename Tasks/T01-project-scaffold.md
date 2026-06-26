# T01 — Project Scaffold

**Đọc AGENTS.md trước khi thực thi task này.**

## Mục tiêu
Khởi tạo toàn bộ cấu trúc project Next.js 15 với TypeScript, cài đặt dependencies, cấu hình tooling, và tạo skeleton các file cần thiết để các task tiếp theo (T02–T13) có thể chạy độc lập.

## Output mong đợi
Một Next.js 15 app chạy được với `pnpm dev`, hiển thị trang placeholder có layout đúng cấu trúc.

## Các bước thực hiện

### Bước 1: Khởi tạo project
```bash
pnpm create next-app@latest vdp-portal \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
cd vdp-portal
```

### Bước 2: Cài đặt dependencies

**Core:**
```bash
pnpm add next-auth@beta @auth/core
pnpm add @tanstack/react-query zustand
pnpm add axios
```

**UI:**
```bash
pnpm add @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm add @radix-ui/react-toast @radix-ui/react-tooltip @radix-ui/react-avatar
pnpm add lucide-react class-variance-authority clsx tailwind-merge
pnpm add cmdk
```

**Data & Table:**
```bash
pnpm add @tanstack/react-table recharts
```

**Kubernetes client (cho Spark/Volcano CRDs):**
```bash
pnpm add @kubernetes/client-node
```

**MinIO client:**
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Dev tools:**
```bash
pnpm add -D @types/node prettier eslint-config-prettier
```

### Bước 3: Cài shadcn/ui
```bash
pnpm dlx shadcn@latest init
# Chọn: Default style, Slate color, CSS variables: yes
pnpm dlx shadcn@latest add button card badge table tabs input textarea select
pnpm dlx shadcn@latest add dialog dropdown-menu toast tooltip avatar separator
pnpm dlx shadcn@latest add skeleton alert progress
```

### Bước 4: Tạo cấu trúc thư mục
Tạo đầy đủ thư mục theo AGENTS.md section 2.3. Mỗi thư mục cần có file `index.ts` hoặc placeholder `page.tsx`.

### Bước 5: Tạo các file cấu hình

**`.env.example`** — copy từ AGENTS.md section 3, điền placeholder values.

**`.env.local`** — tạo từ `.env.example`, điền giá trị thực cho local dev (có thể mock).

**`src/types/index.ts`** — định nghĩa các TypeScript types cốt lõi:
```typescript
// User & Auth
export interface IUser {
  id: string
  name: string
  email: string
  roles: KeycloakRole[]
  accessToken: string
}

export type KeycloakRole = 
  | 'SuperAdmin' | 'Admin' | 'Op' | 'PM'
  | 'DE' | 'DS' | 'DA' | 'BA' | 'Viewer'

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Navigation
export interface NavItem {
  title: string
  href: string
  icon: string
  roles: KeycloakRole[]  // empty array = all roles
}
```

**`src/lib/auth.ts`** — skeleton Auth.js config (chi tiết ở T02):
```typescript
import NextAuth from 'next-auth'
import Keycloak from 'next-auth/providers/keycloak'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Keycloak({})],
  // Config đầy đủ ở T02
})
```

**`src/lib/utils.ts`** — utilities:
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { KeycloakRole, IUser } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hasRole(user: IUser | null, roles: KeycloakRole[]): boolean {
  if (!user) return false
  if (roles.length === 0) return true
  return roles.some(role => user.roles.includes(role))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
```

### Bước 6: Layout skeleton

**`src/app/layout.tsx`** — Root layout với font và providers.

**`src/app/(auth)/login/page.tsx`** — Trang login đơn giản với nút "Đăng nhập bằng VNPT SSO".

**`src/app/(dashboard)/layout.tsx`** — Dashboard layout với:
- Sidebar cố định bên trái (width 240px)
- Header phía trên với tên user + avatar + logout
- Main content area

**`src/app/(dashboard)/page.tsx`** — Landing page placeholder hiển thị "VDP Portal — Đang khởi động các modules".

**`src/components/layout/sidebar.tsx`** — Sidebar với navigation items, icon từ lucide-react, active state theo current route. Nav items được filter theo role từ session.

### Bước 7: Navigation config

**`src/config/navigation.ts`** — Danh sách nav items:
```typescript
import type { NavItem } from '@/types'

export const navItems: NavItem[] = [
  { title: 'Tổng quan', href: '/', icon: 'LayoutDashboard', roles: [] },
  { title: 'Workflows', href: '/workflows', icon: 'GitBranch', roles: ['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'] },
  { title: 'Data Catalog', href: '/catalog', icon: 'Database', roles: ['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'] },
  { title: 'SQL Editor', href: '/query', icon: 'Code2', roles: ['DE', 'DS', 'DA', 'Admin', 'SuperAdmin'] },
  { title: 'Notebooks', href: '/notebooks', icon: 'BookOpen', roles: ['DE', 'DS', 'Admin', 'SuperAdmin'] },
  { title: 'Storage', href: '/storage', icon: 'FolderOpen', roles: ['DE', 'DS', 'Op', 'Admin', 'SuperAdmin'] },
  { title: 'Streams', href: '/streams', icon: 'Activity', roles: ['DE', 'Op', 'Admin', 'SuperAdmin'] },
  { title: 'Spark Jobs', href: '/jobs', icon: 'Zap', roles: ['DE', 'Op', 'Admin', 'SuperAdmin'] },
  { title: 'Observability', href: '/observability', icon: 'BarChart3', roles: ['Op', 'Admin', 'SuperAdmin', 'PM'] },
  { title: 'Quản trị', href: '/admin', icon: 'Settings', roles: ['SuperAdmin'] },
]
```

### Bước 8: Middleware RBAC skeleton

**`src/middleware.ts`**:
```typescript
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isAuthPage = req.nextUrl.pathname.startsWith('/login')

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
```

### Bước 9: Dockerfile

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Thêm vào `next.config.ts`:
```typescript
output: 'standalone'
```

### Bước 10: Helm Chart skeleton

Tạo thư mục `helm/` với:
- `Chart.yaml` — name: vdp-portal, version: 0.1.0
- `values.yaml` — image, replicas, ingress host, env vars từ Secret
- `templates/deployment.yaml`
- `templates/service.yaml`  
- `templates/ingress.yaml` — host: `portal.lakehouse.local`, tls cert-manager annotation `lakehouse-ca`
- `templates/secret.yaml` — chứa env vars nhạy cảm

## Kiểm tra hoàn thành

- [ ] `pnpm dev` chạy không lỗi, mở `http://localhost:3000` thấy trang login
- [ ] `pnpm build` build thành công không có TypeScript error
- [ ] Cấu trúc thư mục khớp với AGENTS.md section 2.3
- [ ] File `.env.example` có đủ tất cả biến từ AGENTS.md section 3
- [ ] Dockerfile build được image
- [ ] Sidebar hiển thị đúng nav items
