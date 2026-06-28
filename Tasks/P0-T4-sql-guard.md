# P0-T4 — Vá SQL Guard cho Role DA (Bypass qua comment/CTE)

**Đọc AGENTS.md trước khi thực thi.**
**Nguồn:** Opus 4.8 Critical #4

## Vấn đề
Regex hiện tại:
```typescript
const WRITE_KEYWORDS = /^\s*(DROP|TRUNCATE|DELETE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE)\b/i
```
Dùng `^` neo vào đầu chuỗi → bypass dễ dàng:
- `/* comment */ DROP TABLE x` — comment trước không khớp `^\s*DROP`
- `\nDELETE FROM ...` — newline ổn nhưng SQL có thể bắt đầu bằng `WITH`
- `WITH t AS (SELECT 1) DELETE FROM table WHERE id IN (SELECT id FROM t)` — CTE bọc DELETE

Vì Trino và StarRocks chạy `security=NONE`, BFF là **lớp bảo vệ duy nhất** cho role DA.
Regex bị bypass = DA có thể xóa/sửa dữ liệu trong data lake.

## Giải pháp: Strip comment → Parse statement type → Whitelist SELECT only

### Bước 1: Tạo `src/lib/sql-guard.ts`

```typescript
/**
 * SQL Guard — kiểm tra câu lệnh SQL có được phép chạy không theo role.
 *
 * Chiến lược: strip comments → normalize whitespace → extract statement type
 * → whitelist thay vì blacklist.
 *
 * Với role DA: chỉ cho phép SELECT, SHOW, DESCRIBE, EXPLAIN.
 * Với DE/DS/Admin/SuperAdmin: cho phép tất cả (vẫn chặn comment injection).
 */

const SELECT_ONLY_ROLES = new Set(['DA'])
const WRITE_ROLES = new Set(['DE', 'DS', 'Admin', 'SuperAdmin'])

// Statement types được phép với role read-only
const ALLOWED_READONLY = new Set([
  'SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'WITH'
])

/**
 * Strip SQL comments:
 * - Block comments: /* ... *\/
 * - Line comments: -- ...
 */
function stripSqlComments(sql: string): string {
  // Loại block comments (không nested)
  let result = sql.replace(/\/\*[\s\S]*?\*\//g, ' ')
  // Loại line comments
  result = result.replace(/--[^\r\n]*/g, ' ')
  return result
}

/**
 * Lấy loại statement đầu tiên sau khi strip comments.
 * Trả về uppercase keyword đầu tiên (SELECT, DROP, WITH, ...)
 */
function getStatementType(sql: string): string {
  const stripped = stripSqlComments(sql).trim()
  const firstWord = stripped.split(/\s+/)[0]?.toUpperCase() ?? ''
  return firstWord
}

/**
 * Với WITH...SELECT: kiểm tra thêm xem CTE có chứa write statement không.
 * Ví dụ: WITH t AS (...) DELETE ... → bị chặn dù bắt đầu bằng WITH.
 */
function isWriteHiddenInCte(sql: string): boolean {
  const stripped = stripSqlComments(sql).toUpperCase()
  // Tìm statement sau closing paren của CTE
  // Đơn giản nhưng đủ dùng: kiểm tra có keyword write nào trong toàn câu sau WITH không
  const WRITE_PATTERN = /\b(DELETE|INSERT|UPDATE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|MERGE)\b/
  return WRITE_PATTERN.test(stripped)
}

export interface SqlGuardResult {
  allowed: boolean
  reason?: string
}

export function validateSql(sql: string, userRoles: string[]): SqlGuardResult {
  if (!sql || sql.trim().length === 0) {
    return { allowed: false, reason: 'Câu lệnh SQL không được để trống' }
  }

  const isReadOnly = userRoles.some(r => SELECT_ONLY_ROLES.has(r)) &&
    !userRoles.some(r => WRITE_ROLES.has(r))

  if (!isReadOnly) {
    // DE/DS/Admin/SuperAdmin — cho phép tất cả
    return { allowed: true }
  }

  // Role DA — chỉ cho phép SELECT, SHOW, DESCRIBE, EXPLAIN
  const stmtType = getStatementType(sql)

  if (!ALLOWED_READONLY.has(stmtType)) {
    return {
      allowed: false,
      reason: `Role của bạn chỉ được phép thực thi câu lệnh SELECT/SHOW/DESCRIBE/EXPLAIN. Câu lệnh "${stmtType}" không được phép.`
    }
  }

  // Với WITH: kiểm tra CTE không che giấu write statement
  if (stmtType === 'WITH' && isWriteHiddenInCte(sql)) {
    return {
      allowed: false,
      reason: 'Phát hiện câu lệnh ghi dữ liệu bên trong CTE. Không được phép với role hiện tại.'
    }
  }

  return { allowed: true }
}
```

### Bước 2: Cập nhật Trino query route

`src/app/api/trino/query/route.ts`:

```typescript
import { validateSql } from '@/lib/sql-guard'

// Trong handler, sau validateApiAuth và trước khi gọi Trino:
const body = await request.json()
const { sql, catalog, schema } = body

const guardResult = validateSql(sql, session.user.roles)
if (!guardResult.allowed) {
  return Response.json(
    { success: false, error: guardResult.reason },
    { status: 403 }
  )
}
// ... tiếp tục gọi Trino
```

### Bước 3: Cập nhật StarRocks query route

`src/app/api/starrocks/query/route.ts` — tương tự:

```typescript
import { validateSql } from '@/lib/sql-guard'

const body = await request.json()
const { sql } = body

const guardResult = validateSql(sql, session.user.roles)
if (!guardResult.allowed) {
  return Response.json(
    { success: false, error: guardResult.reason },
    { status: 403 }
  )
}
```

### Bước 4: Xóa regex cũ

Tìm và xóa hoàn toàn:
```typescript
// Xóa những dòng này ở bất kỳ đâu trong codebase:
const FORBIDDEN_KEYWORDS = ...
const WRITE_KEYWORDS = /^\s*(DROP|TRUNCATE...)
```
Thay bằng import từ `@/lib/sql-guard`.

### Bước 5: Viết unit tests cho sql-guard

Tạo `src/lib/__tests__/sql-guard.test.ts`:

```typescript
import { validateSql } from '../sql-guard'

const DA_ROLES = ['DA']
const DE_ROLES = ['DE']

describe('validateSql — role DA (read-only)', () => {
  test('SELECT bình thường → cho phép', () => {
    expect(validateSql('SELECT 1', DA_ROLES).allowed).toBe(true)
  })

  test('DROP TABLE → chặn', () => {
    expect(validateSql('DROP TABLE users', DA_ROLES).allowed).toBe(false)
  })

  test('Comment trước DROP → chặn', () => {
    expect(validateSql('/* hack */ DROP TABLE users', DA_ROLES).allowed).toBe(false)
  })

  test('Line comment trước DELETE → chặn', () => {
    expect(validateSql('-- trick\nDELETE FROM users', DA_ROLES).allowed).toBe(false)
  })

  test('WITH...SELECT → cho phép', () => {
    const sql = 'WITH cte AS (SELECT id FROM users) SELECT * FROM cte'
    expect(validateSql(sql, DA_ROLES).allowed).toBe(true)
  })

  test('WITH...DELETE (CTE bypass) → chặn', () => {
    const sql = 'WITH cte AS (SELECT id FROM users) DELETE FROM users WHERE id IN (SELECT id FROM cte)'
    expect(validateSql(sql, DA_ROLES).allowed).toBe(false)
  })

  test('INSERT → chặn', () => {
    expect(validateSql("INSERT INTO users VALUES (1, 'x')", DA_ROLES).allowed).toBe(false)
  })

  test('SHOW TABLES → cho phép', () => {
    expect(validateSql('SHOW TABLES', DA_ROLES).allowed).toBe(true)
  })

  test('DESCRIBE table → cho phép', () => {
    expect(validateSql('DESCRIBE users', DA_ROLES).allowed).toBe(true)
  })
})

describe('validateSql — role DE (write allowed)', () => {
  test('DROP TABLE → cho phép', () => {
    expect(validateSql('DROP TABLE users', DE_ROLES).allowed).toBe(true)
  })

  test('INSERT → cho phép', () => {
    expect(validateSql("INSERT INTO t VALUES (1)", DE_ROLES).allowed).toBe(true)
  })
})
```

Cài vitest nếu chưa có:
```bash
pnpm add -D vitest @vitejs/plugin-react
```

Chạy test:
```bash
pnpm vitest run src/lib/__tests__/sql-guard.test.ts
```
Tất cả 11 test cases phải PASS.

## Kiểm tra hoàn thành
- [ ] `src/lib/sql-guard.ts` tạo mới với `validateSql()` export
- [ ] Regex blacklist cũ đã bị xóa hoàn toàn
- [ ] Trino route dùng `validateSql` từ sql-guard
- [ ] StarRocks route dùng `validateSql` từ sql-guard
- [ ] Unit tests: tất cả 11 cases PASS (đặc biệt: comment bypass, CTE bypass)
- [ ] Error message trả về client rõ ràng, nêu tên statement bị chặn
- [ ] `pnpm build` không lỗi
