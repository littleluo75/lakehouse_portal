# Prompts P0 — Fix Critical Issues (Claude Code)

Thứ tự bắt buộc: T1 → T2 → T3 → T4 → T5.
Mỗi task xong phải chạy `pnpm build` pass trước khi sang task tiếp theo.

---

## P0-T1 — Helm Secret + Credential Hardcode

```
Đọc AGENTS.md và Tasks/P0-T1-helm-secret-credentials.md.

Thực thi P0-T1: hoàn thiện Helm Secret và xóa credential hardcode.

Ưu tiên theo thứ tự:
1. Sửa helm/values.yaml — thêm đủ config blocks
2. Viết lại helm/templates/secret.yaml — đủ ~30 env vars, dùng AUTH_SECRET (không phải NEXTAUTH_SECRET)
3. Xóa fallback hardcode trong src/lib/services/starrocks.ts
4. Thống nhất tên biến STARROCKS_HOST
5. Sửa .env.example dùng AUTH_SECRET + ghi chú openssl

Sau khi xong:
- Chạy: helm template data-lighthouse ./helm --set keycloak.clientSecret=test --set nextauth.secret=test --set services.minio.secretKey=test | grep "kind: Secret" -A 60
- Chạy: grep -rn "10.167.70\|minioadmin\|123123123\|GrafanaAdminPass" src/ --include="*.ts"
- Chạy: pnpm build
Báo cáo kết quả 3 lệnh trên.
```

---

## P0-T2 — ClusterRole Nodes + Xóa Mock Data

```
Đọc AGENTS.md và Tasks/P0-T2-clusterrole-mock-data.md.

T1 đã hoàn thành. Thực thi P0-T2.

Ưu tiên:
1. Thêm rule nodes vào helm/templates/rbac.yaml
2. Tìm và xóa TOÀN BỘ mock số cứng trong src/app/api/dashboard/summary/route.ts
3. Sửa TypeScript type sang number | null / string | null
4. Sửa UI hiển thị "Không khả dụng" khi null

Sau khi xong:
- Chạy: grep -n "46 cores\|320 GB\|nodeCount: 3\|Mock Mode" src/ -r
- Chạy: grep -A 3 "nodes" helm/templates/rbac.yaml
- Chạy: pnpm build
Báo cáo kết quả.
```

---

## P0-T3 — MinIO IDOR + Presigned URL TTL

```
Đọc AGENTS.md và Tasks/P0-T3-minio-idor-ttl.md.

T1, T2 đã hoàn thành. Thực thi P0-T3.

Ưu tiên:
1. Tạo src/config/storage-permissions.ts với BUCKET_ACCESS map
2. Viết lại download route: validate bucket allowlist + chặn path traversal + TTL 900s
3. Thêm bucket check vào list objects route
4. Sửa getDownloadUrl nhận TTL dynamic

Sau khi xong:
- Chạy: grep -rn "expiresIn.*3600\|3600.*expiresIn" src/ --include="*.ts"
- Chạy: grep -n "isBucketAllowed" src/app/api/minio/ -r
- Chạy: pnpm build
Báo cáo kết quả.
```

---

## P0-T4 — SQL Guard Bypass Fix

```
Đọc AGENTS.md và Tasks/P0-T4-sql-guard.md.

T1, T2, T3 đã hoàn thành. Thực thi P0-T4.

Ưu tiên:
1. Tạo src/lib/sql-guard.ts với validateSql() — strip comments → whitelist statement type → CTE check
2. Xóa toàn bộ FORBIDDEN_KEYWORDS / WRITE_KEYWORDS regex cũ
3. Cập nhật Trino route dùng validateSql
4. Cập nhật StarRocks route dùng validateSql
5. Cài vitest nếu chưa có, tạo và chạy unit tests

Sau khi xong:
- Chạy: pnpm vitest run src/lib/__tests__/sql-guard.test.ts
  → Tất cả 11 test phải PASS, đặc biệt test comment bypass và CTE bypass
- Chạy: grep -rn "FORBIDDEN_KEYWORDS\|WRITE_KEYWORDS\|\/\^\\\\s\*\(" src/ --include="*.ts"
  → Không có kết quả (đã xóa hết regex cũ)
- Chạy: pnpm build
Báo cáo kết quả.
```

---

## P0-T5 — Air-gapped Font + Token Refresh

```
Đọc AGENTS.md và Tasks/P0-T5-font-airgapped-token-refresh.md.

T1, T2, T3, T4 đã hoàn thành. Thực thi P0-T5.

Fix A — Font air-gapped (làm trước):
1. Xóa import từ 'next/font/google' trong src/app/layout.tsx
2. Dùng phương án system fonts (Phương án 3 trong task file) — không cần download gì
3. Cập nhật tailwind.config.ts fontFamily

Fix B — Token refresh surface lỗi:
1. Thêm error field vào Session type declaration
2. Sửa session callback: khi token.error set → trả session.error + xóa accessToken
3. Sửa validateApiAuth: check session.error → trả 401 với code SESSION_EXPIRED
4. Sửa api-client.ts: auto redirect khi nhận SESSION_EXPIRED
5. Sửa login page: hiển thị thông báo khi ?reason=session_expired

Sau khi xong:
- Chạy: grep -rn "next/font/google" src/ --include="*.ts" --include="*.tsx"
  → Không có kết quả
- Chạy: pnpm build (không cần internet)
- Chạy: grep -n "RefreshAccessTokenError\|SESSION_EXPIRED" src/lib/ -r
  → Có ít nhất 3 dòng (auth.ts, api-auth.ts, api-client.ts)
Báo cáo kết quả.
```

---

## Final Verification (sau khi xong T1–T5)

```
Chạy full verification sau khi hoàn thành tất cả P0 tasks:

1. pnpm tsc --noEmit
2. pnpm build
3. pnpm lint
4. pnpm vitest run

5. Security check:
grep -rn "10.167.70\|minioadmin\|123123123\|GrafanaAdminPass\|46 cores\|320 GB\|nodeCount: 3" src/ --include="*.ts" --include="*.tsx"
→ Không có kết quả

grep -rn "next/font/google\|FORBIDDEN_KEYWORDS\|WRITE_KEYWORDS\|expiresIn.*3600" src/ --include="*.ts" --include="*.tsx"
→ Không có kết quả

6. Cập nhật AUDIT-REPORT.md: đổi các dòng ❌ Critical thành ✅ Fixed, ghi chú "Fixed in P0 round"

Báo cáo tổng kết: bao nhiêu issues đã fix, còn bao nhiêu blocked.
```
