# Hướng Dẫn Đóng Góp & Phát Triển VDP Portal (Contributing Guide)

Chào mừng bạn đến với nhóm phát triển Cổng thông tin hợp nhất **VNPT Data Platform (VDP Portal)**. Tài liệu này hướng dẫn chi tiết quy trình thiết lập môi trường lập trình, quy chuẩn viết mã và các bước bổ sung một module chức năng mới vào hệ thống.

---

## 1. Thiết Lập Môi Trường Phát Triển (Development Setup)

1. **Yêu cầu hệ thống:** Đảm bảo cài đặt `Node.js >= 20` và `pnpm >= 9`.
2. **Clone và cài đặt gói:**
   ```bash
   git clone https://github.com/vnpt/lakehouse_portal.git
   cd lakehouse_portal/vdp-portal
   pnpm install
   ```
3. **Cấu hình môi trường:** Copy file `.env.example` thành `.env.local`. Nếu bạn làm việc ngoài mạng nội bộ VNPT (không kết nối tới Bastion Host), bạn có thể mock các endpoint nội bộ trỏ về `http://localhost:3000/api/mock/*` hoặc chạy SSH Port Forwarding tới cụm RKE2.
4. **Khởi chạy ứng dụng:**
   ```bash
   pnpm dev
   ```

---

## 2. Quy Trình Thêm Module Chức Năng Mới (Step-by-step Guide)

Giả sử bạn cần thêm module mới có tên **`lineage`** (Gia phả dữ liệu nâng cao). Hãy thực hiện tuần tự 5 bước sau:

### Bước 1: Tạo BFF API Route
Tạo thư mục và xử lý request tại `src/app/api/lineage/route.ts`. Luôn bắt lỗi và trả về chuẩn format `{ success: boolean, data?: T, error?: string }`:
```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createInternalClient, ServiceError } from '@/lib/internal-client'

const client = createInternalClient({
  baseUrl: process.env.INTERNAL_OPENMETADATA!,
  authType: 'basic',
  basicCredentials: { username: 'admin', password: 'admin' }
})

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    
    const data = await client('/lineage/global', session)
    return NextResponse.json({ success: true, data })
  } catch (err) {
    if (err instanceof ServiceError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.statusCode })
    }
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}
```

### Bước 2: Tạo Giao Diện Trang (UI Page)
Tạo trang tại `src/app/(dashboard)/lineage/page.tsx`:
```tsx
import { LineageClient } from '@/components/modules/lineage/lineage-client'

export const metadata = { title: 'Data Lineage | VDP Portal' }

export default function LineagePage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <h2 className="text-3xl font-bold tracking-tight">Gia Phả Dữ Liệu</h2>
      <LineageClient />
    </div>
  )
}
```

### Bước 3: Phân Quyền Trong Proxy Middleware
Mở file `src/proxy.ts`, khai báo danh sách vai trò được phép truy cập vào `ROUTE_PERMISSIONS`:
```typescript
const ROUTE_PERMISSIONS: Record<string, KeycloakRole[]> = {
  // ...các routes hiện hữu
  '/lineage': ['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'],
}
```

### Bước 4: Thêm Vào Thanh Điều Hướng (Navigation Bar)
Mở file `src/config/navigation.ts`, bổ sung icon và đường dẫn vào danh sách `navItems`:
```typescript
import { GitFork } from 'lucide-react'

export const navItems = [
  // ...
  {
    title: 'Data Lineage',
    href: '/lineage',
    icon: GitFork,
    roles: ['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'],
  },
]
```

### Bước 5: Thêm Vào Quick Actions (Dashboard Landing Page)
Nếu module mới là thao tác quan trọng, bổ sung vào danh sách hành động nhanh trong trang chủ `src/app/(dashboard)/page.tsx` (hoặc component tương ứng) để hiển thị cho các role được cấp quyền.

---

## 3. Quy Chuẩn Viết Mã (Code Conventions)

- **TypeScript:** Tuyệt đối không sử dụng kiểu dữ liệu `any`. Muốn ép kiểu phải định nghĩa `interface` hoặc `type` rõ ràng trong `src/types/`. Nếu bắt buộc phải dùng `any` trong trường hợp bất khả kháng, phải có comment giải thích lý do `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- [Lý do]`.
- **Console Log:** Không để lại `console.log()` trong production code. Sử dụng `console.error()` hoặc `console.warn()` cho mục đích ghi lỗi máy chủ (Server-side logging).
- **Quy tắc đặt tên:**
  - Component / Pages: `PascalCase` (e.g., `RoleGuard.tsx`, `LineageClient.tsx`).
  - Hàm / Biến / Hooks: `camelCase` (e.g., `createInternalClient`, `useAirflowDags`).
  - Hằng số cấu hình: `UPPER_SNAKE_CASE` (e.g., `ROUTE_PERMISSIONS`).
- **Styling:** Sử dụng tiện ích Tailwind CSS qua class kết hợp utility `cn()` (Tailwind merge + clsx). Tránh viết styles CSS ad-hoc.

---

## 4. Kiểm Thử Các Tuyến BFF (Testing BFF Routes)

Sử dụng `curl` để kiểm chứng phản hồi API ngay trên terminal (truyền Session Cookie thực tế lấy từ trình duyệt):

```bash
# Kiểm tra Health Check
curl -s http://localhost:3000/api/health | jq .

# Kiểm tra Airflow DAGs với Cookie
curl -s -H "Cookie: authjs.session-token=<paste-token-here>" \
     http://localhost:3000/api/airflow/dags | jq .
```

---

## 5. Quy Chuẩn Đặt Tên Commit (Commit Conventions)

Dự án áp dụng theo chuẩn **Conventional Commits**:
- `feat: thêm module tra cứu gia phả dữ liệu lineage`
- `fix: xử lý lỗi polling timeout khi truy vấn Trino`
- `docs: cập nhật hướng dẫn triển khai ArgoCD`
- `refactor: tối ưu hóa kết nối pool StarRocks`
- `chore: nâng cấp các gói phụ thuộc pnpm`
