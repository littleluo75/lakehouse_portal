# Báo Cáo Đánh Giá Sức Khỏe Kho Lưu Trữ (Repository Health Audit)

- **Dự án:** `lakehouse_portal` — VNPT Data Lighthouse
- **Ngày thực hiện:** 2026-07-01
- **Phạm vi rà soát:** `vdp-portal/src/`, `Dockerfile`, `helm/`, `package.json`, `tsconfig.json`
- **Chế độ thực hiện:** Read-Only — không có thay đổi mã nguồn nào được thực hiện

---

## 1. Executive Summary

Toàn bộ 10 phát hiện trong tài liệu lập kế hoạch đã được xác minh bằng evidence thực tế từ mã nguồn. Không phát hiện false positive nào. Ngoài ra, audit xác nhận thêm 4 phát hiện bổ sung (2 tích cực, 2 code smell nhỏ) không có trong tài liệu gốc.

Ứng dụng có kiến trúc BFF tốt với TypeScript strict mode hoàn toàn (`"strict": true`, 0 `any`). Điểm yếu chính tập trung ở lớp bảo mật SQL/injection (P0) và thiếu tối ưu hóa hạ tầng (P1).

### Tổng hợp phát hiện

| Mức độ | Số lượng | Chi tiết |
|---|---|---|
| 🔴 Critical (P0) | 2 | Trino Identifier Injection, SQL Guard Multi-Stmt Bypass |
| 🟠 High (P1) | 3 | StarRocks Connection Pooling, K8s Probe gọi Auth, Thiếu SecurityContext |
| 🟡 Medium (P2) | 3 | Dockerfile thiếu `--chown`, Dead Dependencies, Thiếu CI/CD |
| 🟢 Low (P3) | 2 | Layering Violation import type, TODO tồn đọng |

---

## 2. Overall Health Score: 82 / 100

| Tiêu chí | Điểm | Lý do |
|---|---|---|
| Kiến trúc & BFF Layering | 90/100 | Chỉ 2 route không có `validateApiAuth` (`/auth`, `/health`) — đúng như thiết kế |
| An toàn mã nguồn (Security) | 70/100 | P0-1 Trino injection tại `trino.ts:111,115` và P0-2 multi-stmt bypass tại `sql-guard.ts:37-41` đều có thật |
| Hiệu năng & Tài nguyên | 78/100 | `starrocks.ts:14-37` dùng `createConnection` per-request |
| Chất lượng Code (TypeScript) | 92/100 | 0 `any`, 0 `@ts-ignore`, `"strict": true` trong `tsconfig.json` |
| Hạ tầng & Container | 80/100 | `deployment.yaml` không có `securityContext`, `Dockerfile` thiếu `--chown` |

---

## 3. Phát Hiện Theo Mức Ưu Tiên

### 🔴 P0 — Critical (Khắc phục ngay trước production)

#### P0-1: Trino Identifier Injection
**Trạng thái: CONFIRMED**

| Evidence | Chi tiết |
|---|---|
| `src/lib/services/trino.ts:111` | `` return trinoMetaQuery(`SHOW SCHEMAS FROM "${catalog}"`, username) `` |
| `src/lib/services/trino.ts:115` | `` return trinoMetaQuery(`SHOW TABLES FROM "${catalog}"."${schema}"`, username) `` |
| `src/app/api/trino/schemas/route.ts:9` | `const catalog = searchParams.get('catalog')` → passed thẳng không sanitize |
| `src/app/api/trino/tables/route.ts:10-11` | `catalog` và `schema` từ searchParams → không sanitize |

**Proof of Concept:**
```
catalog = x" UNION SELECT table_name FROM information_schema.tables WHERE "a"="a
```
→ Tạo ra: `SHOW SCHEMAS FROM "x" UNION SELECT table_name FROM information_schema.tables WHERE "a"="a"`
→ Kẻ tấn công có role hợp lệ có thể exfiltrate schema metadata.

---

#### P0-2: SQL Guard Multi-Statement Bypass
**Trạng thái: CONFIRMED (code-level; exploitability hạn chế bởi engine)**

| Evidence | Chi tiết |
|---|---|
| `src/lib/sql-guard.ts:37-41` | `getStatementType` lấy `stripped.split(/\s+/)[0]` — chỉ keyword đầu tiên |
| `src/lib/sql-guard.ts:72-79` | `SELECT 1; DROP TABLE users;` → `stmtType = 'SELECT'` → **pass** |
| `src/lib/sql-guard.ts:82` | CTE write check chỉ chạy khi `stmtType === 'WITH'` |
| `src/lib/__tests__/sql-guard.test.ts` | 9 test cases — **không có test case nào cho multi-statement payload** |

**Phát hiện bổ sung trong `isWriteHiddenInCte`:**
`src/lib/sql-guard.ts:47-50` — `stripSqlComments(sql).toUpperCase()` không loại string literals trước khi regex.
→ `WITH cte AS (SELECT 'DROP TABLE x' as msg) SELECT * FROM cte` bị block nhầm (false positive).

**Exploitability Assessment:** Thực tế thấp — Trino REST `/v1/statement` xử lý từng statement; `mysql2` mặc định disable `multipleStatements`. Tuy nhiên, lớp guard không nên tin vào engine behavior.

---

### 🟠 P1 — High (Khắc phục trước khi scale tải)

#### P1-1: StarRocks Connection Pooling
**Trạng thái: CONFIRMED**

| Evidence | Chi tiết |
|---|---|
| `src/lib/services/starrocks.ts:14` | `const connection = await mysql.createConnection({...})` — tạo mới mỗi request |
| `src/lib/services/starrocks.ts:36-38` | `} finally { await connection.end() }` — đóng sau mỗi request |

Không có module-level pool singleton. Dưới tải cao gây TIME_WAIT exhaustion và tăng latency.

---

#### P1-2: K8s Health Probe gọi Auth Sub-system
**Trạng thái: CONFIRMED**

| Evidence | Chi tiết |
|---|---|
| `src/app/api/health/route.ts:1,4` | `import { auth }` → `const session = await auth()` — gọi Auth.js/OIDC |
| `helm/templates/deployment.yaml:28-31` | `livenessProbe.httpGet.path: /api/health`, `periodSeconds: 10` |
| `helm/templates/deployment.yaml:34-39` | `readinessProbe.httpGet.path: /api/health`, `periodSeconds: 5` |

Keycloak chậm hoặc restart → probe timeout → K8s restart pod dù Next.js vẫn hoạt động.

**Phát hiện bổ sung:** Response trả về `user: session?.user?.name` — health endpoint không nên lộ thông tin user.

---

#### P1-3: Thiếu K8s SecurityContext
**Trạng thái: CONFIRMED**

| Evidence | Chi tiết |
|---|---|
| `helm/templates/deployment.yaml` (toàn bộ 40 dòng) | Không có `securityContext` ở pod spec lẫn container spec |
| `Dockerfile:18,22` | `adduser nextjs` + `USER nextjs` — Dockerfile chạy non-root |
| Gap | Thiếu K8s-level: `runAsNonRoot`, `allowPrivilegeEscalation: false`, `capabilities.drop: ["ALL"]` |

---

### 🟡 P2 — Medium (Chuẩn hóa và tối ưu)

#### P2-1: Dockerfile thiếu `--chown`
**Trạng thái: CONFIRMED**

| Evidence | Chi tiết |
|---|---|
| `Dockerfile:19` | `COPY --from=builder /app/public ./public` — không có `--chown=nextjs:nodejs` |
| `Dockerfile:20` | `COPY --from=builder /app/.next/standalone ./` — không có `--chown` |
| `Dockerfile:21` | `COPY --from=builder /app/.next/static ./.next/static` — không có `--chown` |
| `Dockerfile:22` | `USER nextjs` — chuyển user SAU khi copy, file ownership là `root:root` |

---

#### P2-2: Dead Dependencies (`axios`, `zustand`)
**Trạng thái: CONFIRMED**

| Evidence | Chi tiết |
|---|---|
| `package.json:29` | `"axios": "^1.18.1"` |
| `package.json:46` | `"zustand": "^5.0.14"` |
| `grep "from 'zustand'" src/` | **0 kết quả** |
| `grep "from 'axios'" src/` | **0 kết quả** |

AGENTS.md section 2.1 liệt kê Zustand là "client state" nhưng thực tế codebase dùng `useState` thuần túy.

---

#### P2-3: Thiếu CI/CD Automated Pipeline
**Trạng thái: CONFIRMED**

| Evidence | Chi tiết |
|---|---|
| `.github/` directory | **Không tồn tại** (cả trong `vdp-portal/` và root) |
| `.gitlab-ci.yml` | **Không tồn tại** |
| `package.json:8-9` | Scripts `test`, `lint`, `build` tồn tại nhưng không có automation |

---

### 🟢 P3 — Low / Code Smells

#### P3-1: Layering Violation — Client component import type từ server service
**Trạng thái: CONFIRMED (runtime impact = 0)**

| Evidence | Chi tiết |
|---|---|
| `src/components/modules/admin/admin-client.tsx:37` | `import type { KeycloakUser, KeycloakRoleRepresentation } from '@/lib/services/keycloak-admin'` |
| `src/types/index.ts` | Có `KeycloakRole` nhưng **không có** `KeycloakUser` hay `KeycloakRoleRepresentation` |

`import type` bị TypeScript erase hoàn toàn — zero runtime risk. Thuần túy là vấn đề kiến trúc: types domain cần tách khỏi service implementation.

---

#### P3-2: TODO Comment tồn đọng
**Trạng thái: CONFIRMED**

| Evidence | Chi tiết |
|---|---|
| `src/lib/services/index.ts:25` | `// TODO: sau khi enable OIDC cho OpenMetadata → đổi sang bearer` |
| `AGENTS.md PR-4` | "Enable OIDC cho OpenMetadata" vẫn là TODO hạ tầng chưa hoàn thành |
| `src/lib/services/index.ts:18-26` | Hiện dùng `authType: 'basic'` với admin credentials |

---

## 4. Phát Hiện Bổ Sung (Không có trong tài liệu gốc)

### Tích cực (GOOD)

**AF-1: Toàn bộ API routes đều protected**
- `grep -rL "validateApiAuth"` trên toàn bộ `src/app/api/` chỉ trả về 2 file:
  - `/api/auth/[...nextauth]/route.ts` — NextAuth handler, intentional
  - `/api/health/route.ts` — intentional nhưng xem P1-2
- Kết luận: Claim "mọi API route trừ `/api/health` và `/api/auth` đều áp dụng `validateApiAuth`" được xác nhận 100%.

**AF-2: TypeScript Strict Mode hoàn toàn**
- `tsconfig.json`: `"strict": true`
- Grep toàn `src/`: 0 kết quả cho `as any`, `: any`, `@ts-ignore`, `@ts-expect-error`
- Codebase đạt TypeScript strictness cao nhất.

### Code Smell nhỏ

**AF-3: `console.error` trong production BFF code**

| File | Line | Content |
|---|---|---|
| `src/app/api/dashboard/summary/route.ts` | 133 | `console.error('[Dashboard]...', err)` |
| `src/lib/api-error-handler.ts` | 4 | `console.error('[BFF Error]', error)` |

Server-side error logging — chấp nhận được trong ngắn hạn. Nên migrate sang structured logging khi scale.

**AF-4: Health endpoint trả thông tin user**
`src/app/api/health/route.ts:10-11` trả `user: session?.user?.name` — health probe nên stateless và không expose user data.

---

## 5. Security Findings

| ID | Vấn đề | Severity | Exploitability | Trạng thái |
|---|---|---|---|---|
| P0-1 | Trino Identifier Injection | Critical | Medium (cần valid role) | CONFIRMED |
| P0-2 | SQL Guard Multi-Stmt Bypass | Critical (code) | Low (engine mitigates) | CONFIRMED |
| AF-4 | Health endpoint trả user info | Info | Very low | NEW |

---

## 6. Performance Findings

| ID | Vấn đề | Impact | Trạng thái |
|---|---|---|---|
| P1-1 | StarRocks new connection per request | High — TIME_WAIT exhaustion | CONFIRMED |
| P1-2 | K8s Probe → Auth.js → OIDC overhead | Medium — pod restart loop | CONFIRMED |

---

## 7. Architecture Findings

| ID | Vấn đề | Trạng thái |
|---|---|---|
| P1-3 | K8s SecurityContext missing | CONFIRMED |
| P3-1 | Client layer imports server service types | CONFIRMED |
| P2-3 | No CI/CD automation | CONFIRMED |

---

## 8. Technical Debt

| ID | Vấn đề | Trạng thái |
|---|---|---|
| P2-1 | Dockerfile COPY không có `--chown` | CONFIRMED |
| P3-2 | TODO OpenMetadata OIDC (infrastructure blocker) | CONFIRMED |

---

## 9. Dead Code Report

| Type | Item | Location | Evidence |
|---|---|---|---|
| Dead Dependency | `axios@^1.18.1` | `package.json:29` | 0 imports trong `src/` |
| Dead Dependency | `zustand@^5.0.14` | `package.json:46` | 0 imports trong `src/` |

Dead code trong `src/`: Không phát hiện dead class hoặc dead function. Codebase được tổ chức gọn theo module.

---

## 10. Code Smell Report

| Smell | Location | Severity |
|---|---|---|
| Multi-statement SQL không bị chặn ở guard layer | `sql-guard.ts:37-79` | High |
| `isWriteHiddenInCte` false-positive trên string literals | `sql-guard.ts:47-50` | Medium |
| `import type` từ server service vào client component | `admin-client.tsx:37` | Low |
| TODO comment không có tracking issue | `services/index.ts:25` | Low |
| `console.error` trong production BFF code | 2 occurrences | Very Low |

---

## 11. Risk Assessment

| Rủi ro | Probability | Impact | Score |
|---|---|---|---|
| SQL Injection qua Trino catalog/schema (P0-1) | Medium | High | **HIGH** |
| Bypass read-only DA role (P0-2) | Low | High | **MEDIUM-HIGH** |
| DoS do StarRocks socket exhaustion (P1-1) | High (under load) | Medium | **HIGH** |
| K8s Pod CrashLoop khi Keycloak restart (P1-2) | Medium | High | **HIGH** |
| Privilege escalation trong K8s (P1-3) | Low | High | **MEDIUM** |

---

## 12. Danh Sách File Bị Ảnh Hưởng

| Priority | File | Vấn đề |
|---|---|---|
| P0 | `vdp-portal/src/lib/services/trino.ts` | Line 111, 115 — unsanitized identifier interpolation |
| P0 | `vdp-portal/src/app/api/trino/schemas/route.ts` | Line 9 — unsanitized searchParam |
| P0 | `vdp-portal/src/app/api/trino/tables/route.ts` | Line 10-11 — unsanitized searchParams |
| P0 | `vdp-portal/src/lib/sql-guard.ts` | Line 37-41, 47-50 — multi-stmt bypass + false positive |
| P0 | `vdp-portal/src/lib/__tests__/sql-guard.test.ts` | Missing multi-statement test cases |
| P1 | `vdp-portal/src/lib/services/starrocks.ts` | Line 14 — createConnection per request |
| P1 | `vdp-portal/src/app/api/health/route.ts` | Line 4 — unnecessary `await auth()` in probe |
| P1 | `vdp-portal/helm/templates/deployment.yaml` | Missing securityContext |
| P2 | `vdp-portal/Dockerfile` | Lines 19-21 — missing `--chown` |
| P2 | `vdp-portal/package.json` | Lines 29, 46 — axios, zustand unused |
| P3 | `vdp-portal/src/components/modules/admin/admin-client.tsx` | Line 37 — layer violation |
| P3 | `vdp-portal/src/lib/services/index.ts` | Line 25 — TODO comment |

---

## 13. Quick Wins (1-2 giờ)

1. **`/api/health` cleanup:** Xóa `await auth()`, chỉ trả `{ status: 'ok', timestamp }`. Xóa trường `user` khỏi response.
2. **Gỡ dead dependencies:** `pnpm remove axios zustand` trong `vdp-portal/`.
3. **Dockerfile `--chown`:** Thêm `--chown=nextjs:nodejs` vào 3 lệnh `COPY --from=builder`.
4. **SQL Guard test coverage:** Thêm test case `SELECT 1; DROP TABLE users;` để document và fail fast.

---

## 14. Long-term Improvements

1. **Trino Identifier Sanitization:** Implement `escapeTrinoIdentifier(name: string)` — escape `"` → `""` (SQL standard) và reject control characters.
2. **SQL Guard rebuild với AST Parser:** Thay regex bằng `node-sql-parser` để bóc tách chính xác statement boundaries và string literals.
3. **StarRocks Connection Pool:** Thay `createConnection` bằng module-scope `createPool({ connectionLimit: 10 })`.
4. **K8s SecurityContext:** Thêm `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: ["ALL"]` vào `deployment.yaml`.
5. **CI/CD Pipeline:** GitHub Actions chạy `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `npm audit` trên mỗi PR.
6. **Keycloak types extraction:** Chuyển `KeycloakUser`, `KeycloakRoleRepresentation` từ `keycloak-admin.ts` sang `src/types/keycloak.ts`.

---

## 15. Roadmap Khắc Phục

```
Week 1 — Trước production release (P0 + P1-2):
  ├── P0-1: Sanitize Trino catalog/schema identifiers
  ├── P0-2: Block multi-stmt trong sql-guard + thêm test cases
  └── P1-2: Fix /api/health — xóa auth(), xóa user field

Week 2 — Trước khi scale (P1-1, P1-3, P2-1):
  ├── P1-1: StarRocks connection pool
  ├── P1-3: K8s securityContext trong deployment.yaml
  └── P2-1: --chown flags trong Dockerfile

Week 3 — Housekeeping (P2-2, P2-3, P3-x):
  ├── P2-2: pnpm remove axios zustand
  ├── P2-3: GitHub Actions CI pipeline
  ├── P3-1: Chuyển Keycloak types sang src/types/keycloak.ts
  └── P3-2: Tạo tracking issue cho OpenMetadata OIDC migration
```

---

## 16. Git Diff Summary

```
git diff HEAD:
  .DS_Store — binary change (macOS system file, ngoài kiểm soát audit)

Untracked:
  Tasks/repo-health-audit.md — đã tồn tại trước audit

Source code changes: 0 files
```

**Xác nhận read-only:** Toàn bộ quá trình audit không chỉnh sửa bất kỳ file `src/`, `helm/`, `Dockerfile`, hay `package.json` nào. Repository ở trạng thái giống hệt trước khi bắt đầu kiểm tra.

---

*Báo cáo được thực hiện bởi Claude Code (Sonnet 4.6) — Read-Only Audit Mode — 2026-07-01*
