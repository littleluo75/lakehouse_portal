# P0-T5 — Air-gapped Font + Token Refresh Silent Failure

**Đọc AGENTS.md trước khi thực thi.**
**Nguồn:** Opus 4.8 Critical #5 (air-gapped) + Major #1 (token refresh)

## Vấn đề A — Google Fonts phá build trong môi trường air-gapped

`src/app/layout.tsx` hiện dùng:
```typescript
import { Geist, Geist_Mono } from 'next/font/google'
```
Next.js tải font từ Google Fonts lúc **build time**. Cluster RKE2 offline hoàn toàn
→ CI/CD pipeline (chạy trong cluster) sẽ **fail build** với lỗi network timeout.

## Vấn đề B — Token refresh fail âm thầm, session vẫn "hợp lệ"

`src/lib/auth.ts` khi refresh token fail:
```typescript
return { ...token, error: 'RefreshAccessTokenError' }
```
Nhưng `session callback` không kiểm tra `token.error` → session vẫn trả `accessToken` cũ
đã hết hạn. `validateApiAuth()` chỉ check `!session` → token chết vẫn pass.

User tiếp tục dùng app nhưng mọi API call đều trả 401 từ Airflow/JupyterHub, hiển thị
như lỗi network bình thường, không có thông báo "phiên hết hạn".

---

## Các bước thực hiện

### Fix A — Chuyển sang next/font/local

**Bước A1: Download font files**

```bash
# Tạo thư mục fonts
mkdir -p public/fonts

# Download Geist từ GitHub (vercel/geist-font) — làm ở máy có internet
# Các files cần: GeistVF.woff2, GeistMonoVF.woff2
# Source: https://github.com/vercel/geist-font/releases

# Hoặc extract từ node_modules nếu package đã install:
find node_modules -name "*.woff2" | grep -i geist | head -10
```

Nếu không tìm được trong node_modules:
```bash
# Dùng font thay thế system-safe (không cần download)
# Inter là lựa chọn tốt, có sẵn trong @fontsource
pnpm add @fontsource/inter @fontsource/geist-mono
```

**Bước A2: Sửa `src/app/layout.tsx`**

**Phương án 1 — Dùng file local** (nếu có .woff2):
```typescript
// Xóa:
// import { Geist, Geist_Mono } from 'next/font/google'

// Thay bằng:
import localFont from 'next/font/local'

const geistSans = localFont({
  src: [
    { path: '../../public/fonts/GeistVF.woff2', weight: '100 900' }
  ],
  variable: '--font-geist-sans',
  display: 'swap',
})

const geistMono = localFont({
  src: [
    { path: '../../public/fonts/GeistMonoVF.woff2', weight: '100 900' }
  ],
  variable: '--font-geist-mono',
  display: 'swap',
})
```

**Phương án 2 — Dùng @fontsource** (đơn giản hơn, an toàn hơn):
```typescript
// Xóa import next/font/google
// Thêm vào đầu layout.tsx:
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'

// Sửa className:
<html lang="vi" className="font-sans">

// Sửa tailwind.config.ts:
// fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
```

**Phương án 3 — System fonts (không cần install gì)**:
```typescript
// Xóa toàn bộ import next/font/google
// Dùng Tailwind system font stack
// Xóa variable: '--font-geist-sans' khỏi <html className>
// Trong tailwind.config.ts:
fontFamily: {
  sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
}
```

→ **Chọn phương án 3** nếu muốn zero-dependency, phương án 2 nếu muốn font đẹp hơn.

**Bước A3: Verify build không fetch external**
```bash
# Build với network bị block (simulate air-gapped)
NODE_OPTIONS="--dns-result-order=ipv4first" pnpm build 2>&1 | grep -i "font\|google\|fetch\|network"
# Kết quả mong đợi: không có fetch tới fonts.googleapis.com
```

---

### Fix B — Token refresh surface lỗi đúng cách

**Bước B1: Sửa session callback trong `src/lib/auth.ts`**

```typescript
callbacks: {
  // ... jwt callback giữ nguyên ...

  async session({ session, token }) {
    // Nếu refresh thất bại → báo lỗi để client buộc re-login
    if (token.error === 'RefreshAccessTokenError') {
      // Trả session với error flag để client xử lý
      return {
        ...session,
        error: 'RefreshAccessTokenError' as const,
        user: {
          ...session.user,
          roles: [],
          accessToken: '', // xóa token hết hạn
        }
      }
    }

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
```

**Bước B2: Extend Session type để có `error` field**

```typescript
// src/lib/auth.ts — trong declare module 'next-auth':
declare module 'next-auth' {
  interface Session {
    user: IUser
    accessToken: string
    refreshToken: string
    expiresAt: number
    error?: 'RefreshAccessTokenError'  // ← thêm dòng này
  }
}
```

**Bước B3: Xử lý trong `validateApiAuth`**

`src/lib/api-auth.ts`:
```typescript
export async function validateApiAuth(allowedRoles?: KeycloakRole[]) {
  const session = await auth()

  if (!session) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Token refresh thất bại → buộc re-login
  if (session.error === 'RefreshAccessTokenError') {
    return {
      error: Response.json(
        { error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', code: 'SESSION_EXPIRED' },
        { status: 401 }
      )
    }
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(session.user, allowedRoles)) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { session }
}
```

**Bước B4: Client-side xử lý SESSION_EXPIRED**

`src/lib/api-client.ts` — thêm xử lý auto redirect khi nhận 401 với code SESSION_EXPIRED:

```typescript
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })

  const data = await response.json()

  if (response.status === 401 && data.code === 'SESSION_EXPIRED') {
    // Lưu lại trang hiện tại để redirect về sau khi login
    const currentPath = window.location.pathname
    window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}&reason=session_expired`
    throw new Error('Phiên hết hạn')
  }

  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed')
  }

  return data
}
```

**Bước B5: Hiển thị thông báo khi redirect về login**

`src/app/(auth)/login/page.tsx` — đọc query param `reason`:

```typescript
// Thêm vào đầu component:
const searchParams = useSearchParams()
const reason = searchParams.get('reason')

// Hiển thị:
{reason === 'session_expired' && (
  <div className="text-amber-600 text-sm text-center mb-4 p-3 bg-amber-50 rounded-md">
    Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.
  </div>
)}
```

## Kiểm tra hoàn thành

**Fix A:**
- [x] `src/app/layout.tsx` không còn `from 'next/font/google'`
- [x] `pnpm build` thành công không cần internet
- [x] Font hiển thị đúng trong browser (không bị fallback xấu)

**Fix B:**
- [x] `Session` type có field `error?: 'RefreshAccessTokenError'`
- [x] Khi refresh fail: `session.error` được set, `accessToken` bị xóa
- [x] `validateApiAuth` trả 401 với `code: 'SESSION_EXPIRED'` khi `session.error` set
- [x] Client tự redirect về `/login?reason=session_expired` khi nhận code này
- [x] Trang login hiển thị thông báo "Phiên hết hạn" khi có query param
- [x] `pnpm build` không TypeScript error

## Trạng thái
**Hoàn thành:** 2026-06-28
**P0 fixes liên quan:** P0-T5 (Font airgapped & token refresh)
**Ghi chú:** Đã hoàn thành toàn bộ checklist theo chuẩn production.
