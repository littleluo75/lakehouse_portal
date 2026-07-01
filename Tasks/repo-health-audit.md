# Báo cáo Đánh giá Sức khỏe Toàn diện Kho lưu trữ (Repository Health Audit)

- **Dự án / Kho lưu trữ:** `lakehouse_portal` (Cổng thông tin VNPT Data Lighthouse)
- **Thời gian thực hiện:** 2026-07-01
- **Phạm vi rà soát:** Toàn bộ kiến trúc, mã nguồn (`vdp-portal/src/`), cấu hình hạ tầng (`Dockerfile`, `helm/`), phụ thuộc (`package.json`) và tài liệu (`AGENTS.md`, `docs/`).
- **Chế độ thực hiện:** Planning-Only, Read-Only Audit (Chưa thực thi bất kỳ thay đổi mã nguồn nào).

---

## 1. Executive Summary (Tóm tắt điều hành)

Qua đợt rà soát sức khỏe toàn diện kho lưu trữ `lakehouse_portal`, nhìn chung ứng dụng đã được tái cấu trúc tốt sang kiến trúc **Backend-For-Frontend (BFF)** dựa trên Next.js 16 App Router, tuân thủ nghiêm ngặt TypeScript (không sử dụng `any`/`@ts-ignore`) và phân quyền RBAC đa mức. 

Tuy nhiên, đợt kiểm toán sâu này đã phát hiện **2 điểm yếu bảo mật nghiêm trọng (P0)** liên quan đến nguy cơ Injection tại các endpoint truy vấn metadata Trino và cơ chế lọc câu lệnh SQL Guard cho người dùng chỉ đọc (Role DA), cùng **3 vấn đề ưu tiên cao (P1)** liên quan đến quản lý kết nối cơ sở dữ liệu StarRocks (thiếu Connection Pool), cấu hình Health Probe K8s chưa tối ưu và thiếu tiêu chuẩn Hardening Container trong Helm Chart.

### Tổng hợp số lượng phát hiện (Findings Summary):
- 🔴 **Critical Issues (P0):** 2 (Lỗ hổng Trino Identifier Injection & SQL Guard Multi-Statement Bypass).
- 🟠 **High Priority (P1):** 3 (Thiếu StarRocks Connection Pooling, K8s Liveness Probe gọi Auth sub-system, Thiếu K8s SecurityContext).
- 🟡 **Medium Priority (P2):** 3 (Dockerfile thiếu cờ `--chown`, Dead Dependencies `axios`/`zustand`, Thiếu CI/CD automated pipeline).
- 🟢 **Low Priority (P3) / Code Smells:** 2 (Vi phạm abstraction layer import type từ service server sang client UI, TODO comments tồn đọng).

---

## 2. Overall Health Score (Điểm sức khỏe tổng thể)

**Điểm đánh giá toàn diện: 82 / 100 (Cấp độ: Khá - Cần khắc phục P0/P1 trước khi release production lớn)**

| Tiêu chí | Điểm số | Chi tiết giải trình |
|---|---|---|
| **Kiến trúc & BFF Layering** | 90/100 | Tách biệt rõ ràng Client SPA và Server Proxy; ẩn tuyệt đối credentials nội bộ K8s. |
| **An toàn mã nguồn (Security)** | 70/100 | Bị trừ 30 điểm do lỗi Trino Identifier Injection và nguy cơ lách luật SQL Guard. |
| **Hiệu năng & Tài nguyên (Performance)** | 78/100 | Bị trừ điểm do tạo MySQL connection mới mỗi request thay vì Connection Pool. |
| **Chất lượng Code (TypeScript / UI)** | 92/100 | Type strictness rất tốt, 0 `any`, UI nhất quán với Tailwind v4 + shadcn/ui. |
| **Hạ tầng & Container (DevOps)** | 80/100 | Helm Chart và Dockerfile gọn nhẹ nhưng thiếu probe tối ưu, SecurityContext và CI/CD. |

---

## 3. Phân loại Vấn đề theo Mức Độ Ưu Tiên

### 🔴 Critical Issues (P0) — Cần khắc phục ngay lập tức

#### P0-1: Lỗ hổng Trino Identifier Injection trên API Khám phá Schema/Table
- **Vị trí file:** 
  - `vdp-portal/src/app/api/trino/schemas/route.ts` (dòng 15-18)
  - `vdp-portal/src/app/api/trino/tables/route.ts` (dòng 19-23)
  - `vdp-portal/src/lib/services/trino.ts` (dòng 111, 115)
- **Mô tả:** Các route API lấy tham số `catalog` và `schema` trực tiếp từ query string URL (`searchParams.get('catalog')`) và truyền vào hàm `listTrinoSchemas` / `listTrinoTables`. Các hàm này ghép chuỗi thô (string interpolation) vào câu lệnh SQL: `SHOW SCHEMAS FROM "${catalog}"` mà không hề escape dấu nháy kép (`"`).
- **Nguy cơ:** Kẻ tấn công có role hợp lệ có thể truyền `catalog = 'iceberg"; --'` hoặc chứa ký tự chèn mã, phá vỡ cấu trúc truy vấn, gây ra lỗi backend Trino hoặc thực thi câu lệnh trái phép.

#### P0-2: Nguy cơ Bypass SQL Guard thông qua Multi-Statement Injection
- **Vị trí file:** `vdp-portal/src/lib/sql-guard.ts` (hàm `validateSql`, dòng 72-87)
- **Mô tả:** Hàm `getStatementType` chỉ tách từ khóa đầu tiên của toàn bộ câu lệnh sau khi strip comments. Nếu người dùng Role `DA` (chỉ được SELECT) gửi payload gồm nhiều câu lệnh phân cách bằng dấu chấm phẩy: `SELECT 1; DROP TABLE users;`, hàm kiểm tra sẽ trả về `SELECT` và cho phép request đi qua. Hơn nữa, hàm `isWriteHiddenInCte` kiểm tra keyword ghi bằng regex trên chuỗi chưa loại bỏ string literal, dễ gây block nhầm (false positive) hoặc sót chuỗi lách luật.
- **Nguy cơ:** Bypass hoàn toàn cơ chế bảo vệ read-only đối với Data Analysts nếu database engine/driver cho phép thực hiện nhiều câu lệnh (multi-statement execution).

---

### 🟠 High Priority (P1) — Khắc phục trước khi scale tải

#### P1-1: Cạn kiệt kết nối StarRocks do thiếu Connection Pooling
- **Vị trí file:** `vdp-portal/src/lib/services/starrocks.ts` (hàm `queryStarRocks`, dòng 14-38)
- **Mô tả:** Mỗi khi có request gọi thực thi SQL tới `/api/starrocks/query`, hệ thống khởi tạo một kết nối MySQL mới (`mysql.createConnection`), thực thi truy vấn rồi đóng kết nối (`await connection.end()`).
- **Nguy cơ:** Dưới tải cao hoặc truy vấn liên tục từ Dashboard/Khách hàng, việc liên tục TCP handshake và đóng socket gây cạn kiệt cổng network (TIME_WAIT exhaustion), độ trễ cao và lãng phí tài nguyên Node.js RAM/CPU.

#### P1-2: K8s Liveness/Readiness Probe gọi Auth Sub-system nặng nề
- **Vị trí file:** 
  - `vdp-portal/src/app/api/health/route.ts` (dòng 4)
  - `vdp-portal/helm/templates/deployment.yaml` (dòng 28-39)
- **Mô tả:** K8s kubelet định kỳ gọi endpoint `/api/health` mỗi 5-10 giây để kiểm tra sức khỏe pod. Bên trong handler `/api/health`, hệ thống gọi hàm `await auth()` từ Auth.js. Mặc dù probe của kubelet không có session cookie, hàm `auth()` vẫn chạy logic kiểm tra, đọc biến môi trường và liên kết cấu hình OIDC Keycloak.
- **Nguy cơ:** Khi Keycloak có độ trễ mạng hoặc đang restart, cuộc gọi `auth()` trong probe có thể bị nghẽn/timeout, khiến K8s lầm tưởng pod Portal bị chết và liên tục restart pod dù server Next.js vẫn đang hoạt động hoàn toàn bình thường.

#### P1-3: Thiếu Container Hardening & Security Context trong Helm Deployment
- **Vị trí file:** `vdp-portal/helm/templates/deployment.yaml`
- **Mô tả:** File manifest của pod và container hoàn toàn thiếu khối cấu hình `securityContext` (như `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: ["ALL"]`).
- **Nguy cơ:** Mặc dù Dockerfile có chuyển sang `USER nextjs`, nếu deploy trên cụm K8s tuân thủ CIS Benchmark hoặc Pod Security Standards (Restricted), pod có thể bị từ chối khởi chạy hoặc để ngỏ rủi ro leo thang đặc quyền trong trường hợp container bị khai thác lỗi.

---

### 🟡 Medium Priority (P2) — Khắc phục để chuẩn hóa và tối ưu

#### P2-1: Rủi ro lỗi quyền truy cập file do thiếu `--chown` trong Dockerfile
- **Vị trí file:** `vdp-portal/Dockerfile` (dòng 19-21)
- **Mô tả:** Lệnh `COPY --from=builder /app/.next/standalone ./` sao chép file với quyền mặc định là `root:root`, sau đó mới chuyển sang `USER nextjs`.
- **Nguy cơ:** Nếu Next.js cần ghi log, cache hoặc file tạm vào thư mục làm việc ở runtime, tiến trình chạy dưới user `nextjs` sẽ bị từ chối truy cập (`EACCES Permission denied`).

#### P2-2: Phụ thuộc rác (Dead Dependencies) trong `package.json`
- **Vị trí file:** `vdp-portal/package.json`
- **Mô tả:** Codebase khai thác hoàn toàn native `fetch` và `@tanstack/react-query`, nhưng file `package.json` vẫn cài đặt `axios` (^1.18.1) và `zustand` (^5.0.14). Cả hai gói này không hề được import ở bất cứ đâu trong `src/`.
- **Nguy cơ:** Làm phình to dung lượng `node_modules` và image container, tăng rủi ro dính lỗi cảnh báo bảo mật (CVE) từ các dependencies không sử dụng.

#### P2-3: Thiếu Pipeline tự động hóa kiểm soát chất lượng (CI/CD Automated Checks)
- **Vị trí file:** Khắp kho lưu trữ (Thiếu `.github/workflows/ci.yml` hoặc `.gitlab-ci.yml`).
- **Mô tả:** Hiện tại chưa có pipeline tự động chạy `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test` và scan lỗ hổng mỗi khi tạo Pull Request.

---

### 🟢 Low Priority (P3) / Code Smells — Cải tiến cấu trúc code

#### P3-1: Rò rỉ vi phạm phân lớp kiến trúc (Layering Violation trong Import)
- **Vị trí file:** `vdp-portal/src/components/modules/admin/admin-client.tsx` (dòng 37)
- **Mô tả:** Client component UI import trực tiếp type từ file service phía server: `import type { KeycloakUser, KeycloakRoleRepresentation } from '@/lib/services/keycloak-admin'`.
- **Cải tiến:** Các định nghĩa data type / interface cần được chuyển ra thư mục chia sẻ `src/types/` (ví dụ `src/types/keycloak.ts`) để tách bạch hoàn toàn lớp giao tiếp server-side ra khỏi client UI.

#### P3-2: Nợ kỹ thuật TODO tồn đọng
- **Vị trí file:** `vdp-portal/src/lib/services/index.ts` (dòng 25)
- **Mô tả:** Tồn tại comment: `// TODO: sau khi enable OIDC cho OpenMetadata → đổi sang bearer`. Cần tạo task theo dõi rõ ràng hoặc đóng gói config để tránh quên khi hạ tầng OpenMetadata chuyển đổi SSO.

---

## 4. Báo Cáo Chuyên Sâu Theo Vùng (Audits by Domain)

### 4.1. Phân tích Kiến trúc Tổng thể (Architecture Findings)
- **BFF Architecture:** Tốt. Giao tiếp từ Browser tới Portal đều qua `/api/*`. Các external endpoints nội bộ (`INTERNAL_*`) được giữ an toàn trong environment variables của server pod.
- **Module Dependency:** Rõ ràng, phân định theo route groups (`(auth)`, `(dashboard)`).
- **Layering Violations:** Duy nhất 1 điểm nhầm lẫn import type tại `admin-client.tsx` (P3-1).

### 4.2. Kiểm tra Chất lượng Code & Code Smell Report
- **TypeScript Strictness:** Xuất sắc. 0 trường hợp sử dụng `any`, `@ts-ignore` hoặc `as any`.
- **Dead Code Report:** Không phát hiện class/method thừa trong `src/`. Tuy nhiên có 2 packages thừa (`axios`, `zustand`) trong `package.json`.
- **Độ phức tạp Cyclomatic:** Các client component và API handler được giữ nhỏ gọn, phân tách rõ các client wrappers trong `src/lib/api-client.ts`.

### 4.3. Kiểm tra Spring Boot & Database Audit
- **Giả định & Đánh giá:** Kho lưu trữ `lakehouse_portal` là ứng dụng Node.js/TypeScript thuần túy. Các tiêu chí về Spring Boot Bean Lifecycle, JPA/Hibernate mapping N+1 là **N/A (Not Applicable)**.
- **Database & Query Audit:** Đánh giá trên kết nối trực tiếp đến StarRocks (`mysql2`). Việc sử dụng `mysql.createConnection` mỗi request thay vì Connection Pool là điểm yếu lớn nhất (P1-1).

### 4.4. Kiểm tra API & Security Audit
- **Authentication/Authorization:** Mọi API route (trừ `/api/health` và `/api/auth`) đều áp dụng `validateApiAuth` chuẩn xác.
- **Security Findings:** Phát hiện lỗ hổng nghiêm trọng liên quan đến Injection ký tự nháy kép `"` trong Trino Schema/Table queries (P0-1) và lỗ hổng Multi-Statement trong SQL Guard (P0-2).

### 4.5. Kiểm tra Docker / Kubernetes / Helm Audit
- **Container Build:** Multi-stage build tốt (<200MB). Cần bổ sung `--chown=nextjs:nodejs` (P2-1).
- **K8s Manifests:** Liveness probe không nên gọi Sub-system Auth (P1-2). Cần bổ sung `securityContext` để tuân thủ Best Practices K8s (P1-3).

---

## 5. Risk Assessment (Đánh giá rủi ro tổng thể)

| Rủi ro tiềm ẩn | Khả năng xảy ra (Probability) | Mức độ ảnh hưởng (Impact) | Đánh giá chung |
|---|---|---|---|
| **SQL Injection qua Trino catalog/schema** | Trung bình | Rất cao | **Cao (High Risk)** |
| **Bypass quyền read-only của Role DA** | Cao | Cao | **Rất Cao (Critical Risk)** |
| **DoS/Timeout do cạn kiệt MySQL Socket** | Cao (khi đông user) | Trung bình | **Cao (High Risk)** |
| **K8s Pod CrashLoop do Probe gọi Auth chậm** | Trung bình | Cao | **Cao (High Risk)** |

---

## 6. Danh sách File Cần Sửa Theo Mức Ưu Tiên

| Ưu tiên | File Path | Mục tiêu sửa chữa |
|---|---|---|
| **P0** | `vdp-portal/src/lib/services/trino.ts` | Escape/sanitize ký tự `"` trong tham số `catalog` và `schema` trước khi ghép vào câu `SHOW SCHEMAS/TABLES`. |
| **P0** | `vdp-portal/src/lib/sql-guard.ts` | Bổ sung parse bóc tách string literals, cấm tuyệt đối dấu chấm phẩy `;` (multi-statement) đối với role DA. |
| **P1** | `vdp-portal/src/lib/services/starrocks.ts` | Thay thế `mysql.createConnection` bằng `mysql.createPool` (cấu hình `connectionLimit: 10`). |
| **P1** | `vdp-portal/src/app/api/health/route.ts` | Loại bỏ lời gọi `await auth()` trong health check GET handler, chỉ trả về trạng thái server `ok`. |
| **P1** | `vdp-portal/helm/templates/deployment.yaml` | Bổ sung `securityContext` vào pod và container spec. |
| **P2** | `vdp-portal/Dockerfile` | Thêm cờ `--chown=nextjs:nodejs` vào các lệnh `COPY --from=builder`. |
| **P2** | `vdp-portal/package.json` | Gỡ bỏ dependency `axios` và `zustand`. |
| **P3** | `vdp-portal/src/components/modules/admin/admin-client.tsx` | Chuyển import type `KeycloakUser` sang từ `src/types/keycloak.ts`. |

---

## 7. Đề Xuất Cải Tiến (Recommendations)

### 🚀 Quick Wins (Có thể làm ngay trong 1-2 giờ)
1. **Gỡ bỏ rác dependencies:** Chạy lệnh `pnpm remove axios zustand` để làm sạch `package.json`.
2. **Tối ưu K8s Health Check:** Sửa `src/app/api/health/route.ts` chỉ trả về `status: 'ok'` và timestamp mà không gọi `auth()`.
3. **Thêm cờ `--chown`:** Cập nhật `Dockerfile` để đảm bảo quyền sở hữu file chuẩn cho non-root user.

### 🌟 Long-term Improvements (Cải tiến dài hạn)
1. **Tích hợp bộ phân tích cú pháp SQL thực thụ (AST Parser):** Thay vì dùng regex hoặc split chuỗi thô trong `sql-guard.ts`, nên sử dụng một thư viện phân tích AST SQL nhẹ (như `node-sql-parser`) để đảm bảo bóc tách chính xác 100% lệnh DML/DDL ẩn.
2. **Xây dựng Automated CI Pipeline:** Thêm GitHub Actions hoặc GitLab CI chạy các kiểm tra `pnpm tsc --noEmit`, `pnpm test` tự động cho mọi nhánh.

---

## 8. Kế Hoạch Thực Hiện & Kiểm Chứng (Execution & Verification Plan)

Để khắc phục triệt để các vấn đề trên một cách an toàn và có thể chia nhỏ cho **Parallel Agents** thực hiện đồng thời, dưới đây là lộ trình chi tiết kèm tiêu chí nghiệm thu (Acceptance Criteria):

### Nhóm Agent 1 (Security & SQL Guard Fixes - P0)
- **Bước 1.1:** Sửa hàm `validateSql` trong `src/lib/sql-guard.ts`:
  - Chặn mọi câu SQL chứa ký tự `;` nằm ngoài chuỗi literal (hoặc cấm ký tự `;` nếu role là DA).
  - Viết logic loại bỏ string literals trước khi regex kiểm tra từ khóa cấm trong CTE.
  - *Verify:* Chạy bộ test `pnpm vitest run src/lib/__tests__/sql-guard.test.ts` bổ sung các testcase payload `SELECT 1; DROP TABLE users;` đảm bảo bị từ chối (`allowed: false`).
- **Bước 1.2:** Sửa hàm `listTrinoSchemas` và `listTrinoTables` trong `src/lib/services/trino.ts`:
  - Thay thế chuỗi nháy kép bằng hàm escape chuỗi định danh SQL (hoặc loại bỏ các ký tự đặc biệt khỏi `catalog`/`schema`).
  - *Verify:* Chạy unit test kiểm tra tham số `catalog = 'iceberg"; --'` không thể phá vỡ câu lệnh `SHOW SCHEMAS`.

### Nhóm Agent 2 (Backend Performance & Infra Hardening - P1/P2)
- **Bước 2.1:** Cải tạo `src/lib/services/starrocks.ts`:
  - Khởi tạo `pool = mysql.createPool({ ... connectionLimit: 10 })` ở scope module.
  - Chuyển `connection.execute` thành `pool.execute`.
  - *Verify:* Gọi API `/api/starrocks/query` liên tục 20 lần đồng thời, kiểm tra không bị lỗi rò rỉ socket hoặc mở quá giới hạn connection.
- **Bước 2.2:** Tối ưu hóa Health Probe trong `src/app/api/health/route.ts`:
  - Xóa bỏ `await auth()`.
  - *Verify:* Chạy lệnh `curl -i http://localhost:3000/api/health` dưới 10ms mà không cần cookie hoặc kết nối tới Keycloak.
- **Bước 2.3:** Bổ sung `securityContext` trong `helm/templates/deployment.yaml` và cờ `--chown` trong `Dockerfile`.
  - *Verify:* Chạy `helm template ./helm` kiểm tra YAML đầu ra hợp lệ có khối `securityContext.runAsNonRoot: true`.

---
*Báo cáo được tạo bởi Antigravity AI Agent trong chế độ Planning-Only Read-Only Audit.*
