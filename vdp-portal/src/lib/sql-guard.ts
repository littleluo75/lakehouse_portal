/**
 * SQL Guard — kiểm tra câu lệnh SQL có được phép chạy không theo role.
 *
 * Chiến lược: strip comments → normalize whitespace → extract statement type
 * → whitelist thay vì blacklist.
 *
 * Với role DA: chỉ cho phép SELECT, SHOW, DESCRIBE/DESC, EXPLAIN, WITH (read-only).
 * Với DE/DS/Admin/SuperAdmin: cho phép tất cả (vẫn chặn comment injection).
 *
 * Vì Trino/StarRocks chạy security=NONE, đây là lớp bảo vệ duy nhất cho role DA.
 */

const SELECT_ONLY_ROLES = new Set(['DA'])
const WRITE_ROLES = new Set(['DE', 'DS', 'Admin', 'SuperAdmin'])

// Statement types được phép với role read-only
const ALLOWED_READONLY = new Set(['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'WITH'])

// Keyword ghi dữ liệu — dùng để soi bên trong câu WITH...
const WRITE_PATTERN = /\b(DELETE|INSERT|UPDATE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|MERGE)\b/

/**
 * Strip SQL comments:
 * - Block comments: slash-star ... star-slash (không nested)
 * - Line comments: -- ...
 */
function stripSqlComments(sql: string): string {
  let result = sql.replace(/\/\*[\s\S]*?\*\//g, ' ')
  result = result.replace(/--[^\r\n]*/g, ' ')
  return result
}

/**
 * Lấy loại statement đầu tiên sau khi strip comments.
 * Trả về uppercase keyword đầu tiên (SELECT, DROP, WITH, ...).
 */
function getStatementType(sql: string): string {
  const stripped = stripSqlComments(sql).trim()
  const firstWord = stripped.split(/\s+/)[0]?.toUpperCase() ?? ''
  return firstWord
}

/**
 * Với WITH...SELECT: kiểm tra thêm xem CTE có che giấu write statement không.
 * Ví dụ: WITH t AS (...) DELETE ... → bị chặn dù bắt đầu bằng WITH.
 */
function isWriteHiddenInCte(sql: string): boolean {
  const stripped = stripSqlComments(sql).toUpperCase()
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

  const isReadOnly =
    userRoles.some((r) => SELECT_ONLY_ROLES.has(r)) &&
    !userRoles.some((r) => WRITE_ROLES.has(r))

  if (!isReadOnly) {
    // DE/DS/Admin/SuperAdmin — cho phép tất cả
    return { allowed: true }
  }

  // Role DA — chỉ cho phép SELECT, SHOW, DESCRIBE, EXPLAIN, WITH
  const stmtType = getStatementType(sql)

  if (!ALLOWED_READONLY.has(stmtType)) {
    return {
      allowed: false,
      reason: `Role của bạn chỉ được phép thực thi câu lệnh SELECT/SHOW/DESCRIBE/EXPLAIN. Câu lệnh "${stmtType}" không được phép.`,
    }
  }

  // Với WITH: kiểm tra CTE không che giấu write statement
  if (stmtType === 'WITH' && isWriteHiddenInCte(sql)) {
    return {
      allowed: false,
      reason: 'Phát hiện câu lệnh ghi dữ liệu bên trong CTE. Không được phép với role hiện tại.',
    }
  }

  return { allowed: true }
}
