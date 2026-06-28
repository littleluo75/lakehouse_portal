# P0-T3 — MinIO IDOR + Rút TTL Presigned URL

**Đọc AGENTS.md trước khi thực thi.**
**Nguồn:** Opus 4.8 Critical #3

## Vấn đề
`/api/minio/buckets/[bucket]/download/route.ts` chỉ check role rồi ký presigned URL ngay,
không validate `bucket` và `key` từ request. Bất kỳ user có quyền download đều tải được
**mọi object trong mọi bucket**, kể cả bucket không liên quan đến công việc của họ.

Thêm nữa: presigned URL có `expiresIn: 3600` (1 giờ) — quá dài cho môi trường enterprise,
URL bị lộ (log, Slack, email) vẫn dùng được 1 giờ sau.

## Các bước thực hiện

### Bước 1: Thêm bucket allowlist theo role

Tạo file `src/config/storage-permissions.ts`:

```typescript
import type { KeycloakRole } from '@/types'

// Mỗi role được phép đọc những buckets nào
export const BUCKET_ACCESS: Record<KeycloakRole, string[]> = {
  SuperAdmin: ['iceberg-warehouse', 'spark-events'],
  Admin:      ['iceberg-warehouse', 'spark-events'],
  Op:         ['iceberg-warehouse', 'spark-events'],
  DE:         ['iceberg-warehouse', 'spark-events'],
  DS:         ['iceberg-warehouse'],
  DA:         ['iceberg-warehouse'],
  BA:         [],         // BA không truy cập storage trực tiếp
  PM:         [],
  Viewer:     [],
}

export function isBucketAllowed(roles: KeycloakRole[], bucket: string): boolean {
  return roles.some(role => BUCKET_ACCESS[role]?.includes(bucket))
}
```

### Bước 2: Viết lại download route

`src/app/api/minio/buckets/[bucket]/download/route.ts`:

```typescript
import { validateApiAuth } from '@/lib/api-auth'
import { getDownloadUrl } from '@/lib/services/minio'
import { handleApiError } from '@/lib/api-error-handler'
import { isBucketAllowed } from '@/config/storage-permissions'
import type { KeycloakRole } from '@/types'

// Presigned URL hết hạn sau 15 phút — đủ dùng, không quá dài
const PRESIGNED_TTL_SECONDS = 900

export async function GET(
  request: Request,
  { params }: { params: { bucket: string } }
) {
  try {
    const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'Op', 'Admin', 'SuperAdmin'])
    if (error) return error

    const { bucket } = params
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    // Validate input
    if (!key) {
      return Response.json({ success: false, error: 'Thiếu tham số key' }, { status: 400 })
    }

    // Chặn path traversal
    if (key.includes('..') || key.startsWith('/')) {
      return Response.json({ success: false, error: 'Đường dẫn không hợp lệ' }, { status: 400 })
    }

    // Kiểm tra bucket có trong allowlist của role này không
    const userRoles = session.user.roles as KeycloakRole[]
    if (!isBucketAllowed(userRoles, bucket)) {
      return Response.json(
        { success: false, error: 'Bạn không có quyền truy cập bucket này' },
        { status: 403 }
      )
    }

    const url = await getDownloadUrl(bucket, key, PRESIGNED_TTL_SECONDS)

    return Response.json({
      success: true,
      data: { url, expiresIn: PRESIGNED_TTL_SECONDS }
    })
  } catch (err) {
    return handleApiError(err)
  }
}
```

### Bước 3: Cập nhật `src/lib/services/minio.ts`

Sửa hàm `getDownloadUrl` để nhận TTL dynamic thay vì hardcode:

```typescript
// Trước
export async function getDownloadUrl(bucket: string, key: string) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(s3Client, cmd, { expiresIn: 3600 }) // ← hardcode 1 giờ
}

// Sau
export async function getDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 900  // default 15 phút
) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(s3Client, cmd, { expiresIn })
}
```

### Bước 4: Áp dụng tương tự cho list objects route

`src/app/api/minio/buckets/[bucket]/objects/route.ts` — cũng cần kiểm tra bucket allowlist:

```typescript
// Thêm vào đầu handler, sau validateApiAuth:
const userRoles = session.user.roles as KeycloakRole[]
if (!isBucketAllowed(userRoles, params.bucket)) {
  return Response.json(
    { success: false, error: 'Bạn không có quyền truy cập bucket này' },
    { status: 403 }
  )
}
```

### Bước 5: Verify

```bash
# Kiểm tra không còn expiresIn: 3600 trong source
grep -rn "expiresIn.*3600\|3600.*expiresIn" src/ --include="*.ts"
# Kết quả mong đợi: không có

# Kiểm tra download route có isBucketAllowed check
grep -n "isBucketAllowed" src/app/api/minio/ -r
# Kết quả mong đợi: có ít nhất 2 dòng (download + objects)
```

## Kiểm tra hoàn thành
- [ ] `storage-permissions.ts` tạo với `BUCKET_ACCESS` map đầy đủ 9 roles
- [ ] Download route kiểm tra `isBucketAllowed` trước khi ký URL
- [ ] Path traversal bị chặn (`..` và `/` ở đầu key)
- [ ] `expiresIn` download route = 900 giây (15 phút), không phải 3600
- [ ] List objects route cũng check `isBucketAllowed`
- [ ] `pnpm build` không lỗi
