# Changelog — VNPT Data Lighthouse

Tất cả thay đổi quan trọng của dự án được ghi lại ở đây.
Format theo [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned (P1 — tuần đầu vận hành)
- [ ] Single-flight token refresh (chống race condition nhiều tab)
- [ ] Server-side cache cho dashboard summary (TTL 30-60s)
- [ ] Structured logging với pino + request correlation ID
- [ ] Tách /api/health/live và /api/health/ready
- [ ] External Secrets Operator thay vì Helm secret plaintext
- [ ] Đồng bộ nav items ↔ ROUTE_PERMISSIONS (navigation.ts vs proxy.ts)

### Planned (P2 — sau khi ổn định)
- [ ] Deep-link Catalog → SQL Editor (nút "Query bảng này")
- [ ] Autosave SQL query nháp vào localStorage khi session hết hạn
- [ ] Health display ngôn ngữ thân thiện (thay "12ms" bằng "Hoạt động bình thường")
- [ ] Connection pool cho StarRocks (thay vì tạo connection mỗi query)
- [ ] Exponential backoff + abort signal cho Trino polling
- [ ] Playwright E2E tests cho Keycloak login flow
- [ ] Vitest coverage report

---

## [0.2.0] — 2026-06-28 — P0 Security & Stability Fixes

### Security
- **[CRITICAL]** Fix MinIO IDOR: thêm bucket allowlist theo role, chặn path traversal
- **[CRITICAL]** Fix SQL guard bypass: thay regex blacklist bằng comment stripping + statement whitelist
- **[CRITICAL]** Giảm presigned URL TTL từ 3600s xuống 900s (15 phút)
- **[CRITICAL]** Xóa hardcoded credentials (StarRocks root@10.167.70.13, MinIO minioadmin)

### Fixed
- **[CRITICAL]** Helm Secret thiếu ~20 env vars → app không hoạt động trong cluster
- **[CRITICAL]** AUTH_SECRET key mismatch (NextAuth v5 cần AUTH_SECRET, không phải NEXTAUTH_SECRET)
- **[CRITICAL]** Dashboard hiển thị mock data giả (3 nodes/46 cores/320 GB) khi ClusterRole thiếu quyền nodes
- **[MAJOR]** next/font/google phá build trong môi trường air-gapped → chuyển sang system fonts
- **[MAJOR]** Token refresh failure âm thầm: session tiếp tục với accessToken hết hạn
  → thêm session.error → client redirect /login với thông báo rõ ràng

### Added
- `src/config/storage-permissions.ts` — BUCKET_ACCESS map theo role
- `src/lib/sql-guard.ts` — validateSql() với comment stripping + CTE check
- `src/lib/__tests__/sql-guard.test.ts` — 11 unit test cases
- ClusterRole quyền `nodes` trong helm/templates/rbac.yaml

### Changed
- Đổi tên sản phẩm: VDP Portal → **VNPT Data Lighthouse**
- `package.json` name: vdp-portal → data-lighthouse
- Helm chart name: vdp-portal → data-lighthouse
- Tất cả UI labels, meta title, sidebar header cập nhật tên mới

---

## [0.1.0] — 2026-06-27 — Initial Release

### Added
- T01: Project scaffold — Next.js 16.2.9, TypeScript 5, shadcn/ui, pnpm, Dockerfile, Helm chart
- T02: Authentication — Auth.js v5 + Keycloak OIDC, token refresh, session management
- T03: BFF Proxy Layer — createInternalClient factory, MinIO S3 SDK, Kubernetes client
- T04: Module Airflow — DAG list/trigger/pause, run history, RoleGuard integration
- T05: Module OpenMetadata — Data catalog search, table detail, lineage view, data quality score
- T06: Module SQL Editor — CodeMirror 6, Trino polling protocol, StarRocks mysql2, export CSV
- T07: Module JupyterHub — Server lifecycle management, profile selection, SSE polling
- T08: Module Kafka — Khám phá topics, partitions, consumer groups lag monitoring theo kịch bản tích hợp
- T09: Module MinIO — S3 file browser, presigned download, breadcrumb navigation, formatBytes utility
- T10: Module Observability — Grafana iframe embed, health check 6 services, auto-refresh 60s
- T11: Module Spark Jobs — SparkApplication CRD monitoring, driver logs drawer, Spark UI link
- T12: RBAC & Admin — Route proxy matcher, RoleGuard component, Keycloak Admin API, cluster health check
- T13: Dashboard — Aggregate summary, K8s cluster health grid, role-filtered activity feed
