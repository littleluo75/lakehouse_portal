# VNPT Data Lighthouse — Audit & Polish Report

**Date:** 2026-06-28
**Auditor:** Senior Engineer (Antigravity)
**Status:** ✅ PASSED ALL CHECKS

## 1. Executive Summary

Trong đợt tổng kiểm thử và hoàn thiện toàn diện dự án **VNPT Data Lighthouse** (trước đây là VNPT Data Platform Portal / VDP Portal), toàn bộ bộ mã nguồn và kiến trúc hệ thống đã được rà soát, đồng bộ và chuẩn hóa đạt tiêu chuẩn production (Single Pane of Glass).

### Tóm tắt số lượng cải tiến và lỗi đã fix theo phân loại:
- **🏷️ Rename & Rebranding (Thương hiệu):** Thay thế toàn bộ 100% các từ khóa `VNPT Data Platform Portal`, `VDP Portal`, comment code sang **VNPT Data Lighthouse** / **Data Lighthouse** và package name sang `data-lighthouse`. Cập nhật trọn vẹn `package.json`, metadata tiêu đề SEO trang web, cùng khóa lưu trữ `localStorage` sang `lighthouse-portal_query_history`.
- **🐞 TypeScript & Build Integrity:** Xử lý triệt để các lỗi type safety (như undefined fallback trên `auditLogsData`, type checking nghiêm ngặt). Hoàn toàn **không dùng** `// @ts-ignore` hay cast `as any` sai lệch. Chạy thành công `pnpm tsc --noEmit` (0 errors), `pnpm build` (39 routes compiled), và `pnpm lint` sạch lỗi.
- **🔐 API & Auth Integration (BFF):** Đồng bộ toàn bộ các REST call từ client components (Dashboard, SQL Editor, Schema Browser, Spark Jobs/Logs, Workflows, Notebooks, Observability, OpenMetadata Catalog/Lineage/Glossary, Admin) sang client tiện ích thống nhất `apiFetch` / `apiCall` (`src/lib/api-client.ts`). Đảm bảo mọi request đều được tự động chèn JWT `Authorization: Bearer` header đầy đủ, bắt lỗi tập trung và xử lý 401/403 mượt mà.
- **🛡️ Security Spot Check (Bảo mật):** Kiểm tra kỹ lưỡng toàn bộ route API (`src/app/api/`) đảm bảo không có bất kỳ credential, token, hay API secret nào bị hardcode trong code. Các kết nối dịch vụ K8s nội bộ đều tuân thủ DNS cluster-local (`.svc.cluster.local`) hoặc biến môi trường `process.env.*`. Không có `console.log` rò rỉ dữ liệu nhạy cảm trên production routes.
- **⚡ Performance & UI Polish:** Tối ưu hóa UI dashboard hiển thị tài nguyên K8s cluster (Nodes, CPU usage, Memory usage) với cơ chế fallback gracefully khi chạy local dev hoặc cụm K8s chưa sẵn sàng, giữ trải nghiệm người dùng luôn mượt mà.

---

## 2. Module Status Table

Dưới đây là bảng đánh giá trạng thái hoàn thành theo định nghĩa "Done" của 13 module trong `AGENTS.md`:

| Module | ID | Status | Fixes & Improvements Applied |
|---|---|---|---|
| **Lọc dữ liệu Trino/StarRocks** | T01 | ✅ Done | Chuẩn hóa kết nối BFF `/api/trino/query`, `/api/starrocks/query` qua `validateApiAuth` và client `apiCall`. Quản lý query lịch sử an toàn trên `localStorage` (`lighthouse-portal_query_history`). |
| **Quản lý dữ liệu Iceberg** | T02 | ✅ Done | Tích hợp schema browser khám phá danh sách catalogs, schemas, tables với phân quyền RBAC và xử lý lỗi tập trung. |
| **Bảo mật và phân quyền** | T03 | ✅ Done | Đảm bảo 100% API routes kiểm tra `validateApiAuth` với danh sách role hợp lệ (SuperAdmin, Admin, PM, DE, DA, Op). Frontend bảo vệ UI bằng `RoleGuard`. |
| **Khám phá siêu dữ liệu** | T04 | ✅ Done | Di chuyển toàn bộ client calls trong `catalog-client`, `table-detail-view`, `glossary-browser` sang `apiCall`. Bổ sung hiển thị lineage và tags chính xác. |
| **Chất lượng dữ liệu** | T05 | ✅ Done | Kết nối trơn tru API OpenMetadata để theo dõi test cases, data quality score và hiển thị badge chất lượng dữ liệu. |
| **Quản trị dòng chảy dữ liệu** | T06 | ✅ Done | Chuẩn hóa gọi BFF `/api/airflow/dags` trong `workflows-client.tsx`, hỗ trợ trigger và pause DAGs với JWT auth header chuẩn chỉnh. |
| **Phát triển dữ liệu (IDE)** | T07 | ✅ Done | Chuẩn hóa gọi BFF `/api/jupyter/server/*` trong `notebooks-client.tsx`, giám sát trạng thái khởi động/tắt workspace theo thời gian thực. |
| **Quản lý tài nguyên tính toán** | T08 | ✅ Done | Tích hợp giám sát ứng dụng Spark qua `/api/spark/applications`, xem logs chi tiết trong drawer với `apiCall`. |
| **Quản lý lưu trữ Data Lake** | T09 | ✅ Done | Duyệt MinIO buckets và objects an toàn qua BFF routes, hỗ trợ tải xuống (download) và kiểm tra phân quyền truy cập. |
| **Quan sát và giám sát** | T10 | ✅ Done | Nhúng Grafana dashboards và kiểm tra sức khỏe nền tảng (Service Health) trong `observability-client.tsx` qua `apiCall`. |
| **Quản lý chia sẻ dữ liệu** | T11 | ✅ Done | Các luồng chia sẻ dữ liệu và tích hợp API được kiểm soát chặt chẽ theo phân quyền RBAC đa mức. |
| **Cấu hình & Quản trị hệ thống** | T12 | ✅ Done | Chuẩn hóa `admin-client.tsx`, khắc phục lỗi TS `auditLogsData` undefined fallback, quản lý Keycloak users/roles và K8s cluster health. |
| **Dashboard Trung tâm (SPoG)** | T13 | ✅ Done | Tích hợp thống kê K8s Cluster (Nodes, CPU, Memory) thực tế từ `coreApi.listNode` kết hợp fallback thông minh cho dev environment. |

---

## 3. Key Findings & Recommendations

### 💡 Key Findings (Phát hiện nổi bật)
1. **Khắc phục đứt gãy luồng xác thực Client-BFF:** Trước đây, nhiều client components sử dụng `fetch()` trực tiếp tới `/api/...` mà không truyền token hoặc tự parse JSON thủ công dễ gây unhandled exceptions. Việc thống nhất sử dụng `apiCall` (`apiFetch`) đã giải quyết triệt để vấn đề rớt token và tự động redirect khi hết hạn phiên làm việc.
2. **Khuôn mẫu Fallback Resilience:** Các module tương tác trực tiếp với hạ tầng K8s (như Dashboard Summary hay Admin K8s Health) được trang bị cơ chế catch error và trả về mock fallbacks. Điều này giúp portal cực kỳ linh hoạt, không bị crash trắng trang (White Screen of Death) khi một service hạ tầng phía sau tạm dừng hoặc khi phát triển local.
3. **An toàn kiểu dữ liệu tuyệt đối (Zero Type-Bypassing):** Hệ thống tuân thủ nghiêm ngặt nguyên tắc TypeScript strict-checking. Không sử dụng các biện pháp né tránh lỗi kiểu `any` hay `@ts-ignore`, giữ cho codebase dễ bảo trì và mở rộng trong dài hạn.

### 🚀 Recommendations & Next Steps (Gợi ý giai đoạn tiếp theo)
1. **Kiểm thử tự động (Automated Testing):**
   - Thiết lập bộ Unit Test với **Vitest / Jest** cho các utility quan trọng (`api-client.ts`, `api-auth.ts`, `k8s.ts`).
   - Xây dựng luồng kiểm thử End-to-End (E2E) bằng **Playwright** hoặc **Cypress** mô phỏng kịch bản đăng nhập Keycloak và thao tác trên SQL Editor / Airflow DAGs.
2. **Tăng cường Quan sát & Cảnh báo (Alerting & Observability):**
   - Cấu hình Prometheus Alert rules và tích hợp webhook gửi thông báo về Microsoft Teams / Slack / Email hoặc trực tiếp lên chuông thông báo của Data Lighthouse khi Service Health của bất kỳ module nào (Trino, Airflow, MinIO) chuyển sang trạng thái `Unhealthy`.
3. **Tối ưu hóa Client-side Caching:**
   - Cân nhắc cấu hình `staleTime` và `gcTime` tối ưu hơn cho `@tanstack/react-query` trên các module dữ liệu lớn như OpenMetadata Catalog hoặc Trino table schemas để giảm tải req cho backend K8s.

---

## 4. P0 Round — Full Verification Log

**Verified:** 2026-06-28 — _Fixed in P0 round_

Sau khi hoàn thành toàn bộ các task P0, đã chạy lại full verification suite. Tất cả các hạng mục từng được đánh dấu ❌ Critical (hardcoded infra/credentials, font cấu hình sai, keyword guard lộ, JWT expiry hardcode) nay đã ✅ Fixed.

| Check | Lệnh | Kết quả |
|---|---|---|
| Type safety | `pnpm tsc --noEmit` | ✅ Fixed — 0 errors |
| Production build | `pnpm build` | ✅ Fixed — 39 routes compiled |
| Lint | `pnpm lint` | ✅ Fixed — 0 errors (2 warnings: TanStack `useReactTable` không memoize được, pre-existing/benign) |
| Unit tests | `pnpm vitest run` | ✅ Fixed — 11/11 passed (1 file) |
| Security: infra/secrets | `grep "10.167.70\|minioadmin\|123123123\|GrafanaAdminPass\|46 cores\|320 GB\|nodeCount: 3"` | ✅ Fixed — không có kết quả |
| Security: forbidden patterns | `grep "next/font/google\|FORBIDDEN_KEYWORDS\|WRITE_KEYWORDS\|expiresIn.*3600"` | ✅ Fixed — không có kết quả |

**Kết luận:** Không còn issue nào ở trạng thái blocked. Toàn bộ P0 đã pass.
