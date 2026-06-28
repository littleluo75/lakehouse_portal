# T06 — Module SQL Editor (Trino / StarRocks)

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01, T02, T03 đã hoàn thành.

## Mục tiêu
Trang `/query` — SQL editor chạy query trên Trino (Iceberg lakehouse) và StarRocks (OLAP).

## Roles được phép
`DE`, `DS`, `DA`, `Admin`, `SuperAdmin`

## Cài đặt thêm
```bash
pnpm add @uiw/react-codemirror @codemirror/lang-sql @codemirror/theme-one-dark
pnpm add mysql2
pnpm add papaparse
pnpm add -D @types/papaparse
```

## Trino REST Protocol (BFF xử lý hoàn toàn)

Trino dùng HTTP polling protocol — BFF phải xử lý toàn bộ, client chỉ gọi một request:

```
Bước 1: POST /v1/statement
  Headers: X-Trino-User: {username}, X-Trino-Catalog: iceberg, X-Trino-Schema: default
  Body: "SELECT 1" (plain text, NOT JSON)

Response: { id, nextUri, columns?, data?, stats, error? }

Bước 2: Poll GET {nextUri} cho đến khi nextUri = null
  → Mỗi lần poll delay 100ms
  → Gom columns + data từ tất cả responses
  → Timeout tổng: 60 giây
```

## StarRocks — MySQL Protocol
```typescript
// src/lib/services/starrocks.ts
import mysql from 'mysql2/promise'

export async function queryStarRocks(sql: string) {
  const connection = await mysql.createConnection({
    host: '10.167.70.13',
    port: 30030,
    user: 'root',
    password: '',
    database: 'information_schema',
  })
  try {
    const [rows, fields] = await connection.execute(sql)
    return { rows, fields }
  } finally {
    await connection.end()
  }
}
```

## BFF API Routes
```
POST /api/trino/query
  Body: { sql: string, catalog?: string, schema?: string }
  Response: { columns: string[], rows: unknown[][], stats: { elapsed: number, rowCount: number } }

POST /api/starrocks/query
  Body: { sql: string }
  Response: { columns: string[], rows: unknown[][], stats: { elapsed: number } }

GET /api/trino/catalogs
GET /api/trino/schemas?catalog=iceberg
GET /api/trino/tables?catalog=iceberg&schema=default
```

## Security — BFF PHẢI enforce
```typescript
// Role DA: chỉ được SELECT
// Role DE/DS/Admin/SuperAdmin: được tất cả
const SELECT_ONLY_ROLES = ['DA']
const WRITE_KEYWORDS = /^\s*(DROP|TRUNCATE|DELETE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE)\b/i

function validateQuery(sql: string, roles: string[]): { allowed: boolean; reason?: string } {
  const isSelectOnly = roles.some(r => SELECT_ONLY_ROLES.includes(r)) &&
    !roles.some(r => ['DE', 'DS', 'Admin', 'SuperAdmin'].includes(r))

  if (isSelectOnly && WRITE_KEYWORDS.test(sql.trim())) {
    return { allowed: false, reason: 'Role DA chỉ được phép thực thi câu lệnh SELECT' }
  }
  return { allowed: true }
}
```

## UI Components

### Layout 2 cột
- Sidebar trái (240px): Schema Browser
- Main area: Editor + Results

### SQL Editor (main area, trên)
- Engine toggle: **Trino** | **StarRocks** (radio buttons đầu trang)
- Catalog/Schema dropdowns (chỉ hiện với Trino)
- `CodeMirror` editor với:
  - SQL syntax highlighting
  - Theme: `oneDark`
  - Phím tắt Ctrl+Enter → Run
  - Line numbers, fold gutters
- Toolbar: nút **Run** (primary) + **Clear** + hiển thị elapsed time khi đang chạy

### Results Panel (main area, dưới — resizable)
**Trạng thái "Đang thực thi":** Spinner + "Đang thực thi... (Xs)"

**Khi có kết quả:**
- Info bar: "Trả về X hàng trong Y giây"
- Data table: cột từ `columns`, rows từ `rows`, pagination 100 rows/page
- Nút **Export CSV**: dùng `papaparse` để convert + download

**Khi có lỗi:**
- Alert đỏ hiển thị error message từ Trino/StarRocks (rõ ràng, không che giấu)

### Schema Browser (sidebar trái)
- Tree: Catalog → Schema → Tables (lazy load từng level)
- Click tên table → insert `SELECT * FROM catalog.schema.table LIMIT 100` vào editor

### Query History
- Lưu 20 queries gần nhất trong `localStorage` key `vdp_query_history`
- Dropdown "Lịch sử" → click item → load vào editor

## Kiểm tra hoàn thành
- [x] `SELECT 1` trả về kết quả từ Trino
- [x] Query lên bảng Iceberg thực trả về data
- [x] StarRocks query hoạt động
- [x] Role `DA` bị reject khi chạy DROP/INSERT — hiển thị thông báo rõ ràng
- [x] Timeout 60 giây hiển thị thông báo
- [x] Export CSV download đúng file
- [x] Schema browser load catalogs/schemas/tables
- [x] Query history lưu và load lại được
- [x] `pnpm build` không lỗi

## Trạng thái
**Hoàn thành:** 2026-06-28
**P0 fixes liên quan:** P0-T4 (SQL guard)
**Ghi chú:** Đã xác minh thực tế triển khai trên production codebase.
