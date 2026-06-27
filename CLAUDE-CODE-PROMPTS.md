# Ready-to-use Prompts cho Claude Code — VDP Portal

Copy từng prompt bên dưới, paste thẳng vào Claude Code. Không cần sửa gì thêm.

---

## T01 — Project Scaffold

```
Đọc file AGENTS.md và Tasks/T01-project-scaffold.md trong thư mục hiện tại.

Thực thi toàn bộ các bước trong T01 để khởi tạo project VDP Portal.

Sau khi xong: chạy `pnpm build` và báo cáo kết quả + danh sách files đã tạo.
```

---

## T02 — Auth Keycloak

```
Đọc AGENTS.md và Tasks/T02-auth-keycloak.md.

T01 đã hoàn thành. Thực thi T02: tích hợp Auth.js v5 với Keycloak realm "lakehouse".

Sau khi xong: chạy `pnpm build`, confirm không TypeScript error.
```

---

## T03 — BFF Proxy Layer

```
Đọc AGENTS.md và Tasks/T03-bff-proxy-layer.md.

T01, T02 đã hoàn thành. Thực thi T03: xây dựng BFF proxy layer.

Sau khi xong: test GET /api/health trả về { success: true }, chạy `pnpm build`.
```

---

## T04 — Module Airflow

```
Đọc AGENTS.md và Tasks/T04-module-airflow.md.

T01, T02, T03 đã hoàn thành. Thực thi T04: module Workflows (Airflow).

Sau khi xong: chạy `pnpm build`, tick các mục trong checklist "Kiểm tra hoàn thành".
```

---

## T05 — Module OpenMetadata

```
Đọc AGENTS.md và Tasks/T05-module-openmetadata.md.

T01, T02, T03 đã hoàn thành. Thực thi T05: module Data Catalog (OpenMetadata).

Sau khi xong: chạy `pnpm build`, tick checklist.
```

---

## T06 — Module SQL Editor

```
Đọc AGENTS.md và Tasks/T06-module-sql-editor.md.

T01, T02, T03 đã hoàn thành. Thực thi T06: SQL Editor cho Trino và StarRocks.

Lưu ý quan trọng:
- Trino dùng HTTP polling protocol (không phải JDBC) — BFF phải xử lý polling hoàn toàn
- StarRocks dùng mysql2 library kết nối TCP
- Cài thêm: pnpm add @uiw/react-codemirror @codemirror/lang-sql mysql2 papaparse

Sau khi xong: chạy `pnpm build`, tick checklist.
```

---

## T07 — Module JupyterHub

```
Đọc AGENTS.md và Tasks/T07-module-jupyterhub.md.

T01, T02, T03 đã hoàn thành. Thực thi T07: module Notebooks (JupyterHub).

Sau khi xong: chạy `pnpm build`, tick checklist.
```

---

## T08 — Module Kafka

```

```

---Đọc AGENTS.md và Tasks/T08-module-kafka.md.

T01, T02, T03 đã hoàn thành. Thực thi T08: module Streams (Kafka Monitor).

Bước đầu tiên: tìm trong repo lakehouse_infra xem Kafka đã được deploy chưa và theo kịch bản nào (A/B/C như mô tả trong task file). Báo cáo kịch bản trước khi code.

Sau khi xong: chạy `pnpm build`, tick checklist.

## T09 — Module MinIO

```
Đọc AGENTS.md và Tasks/T09-module-minio.md.

T01, T02, T03 đã hoàn thành. T03 đã có S3Client setup.
Thực thi T09: Storage Browser (MinIO).

Sau khi xong: chạy `pnpm build`, tick checklist.
```

---

## T10 — Module Observability

```
Đọc AGENTS.md và Tasks/T10-module-observability.md.

T01, T02, T03 đã hoàn thành. Thực thi T10: Observability (Grafana embed + health check).

Bước đầu tiên: gọi Grafana API để lấy dashboard UIDs và panel IDs thực tế,
điền vào src/config/grafana.ts trước khi build UI.

Lưu ý: cần PR-3 (allow_embedding: true) đã merge trong lakehouse_infra trước khi iframe hoạt động.

Sau khi xong: chạy `pnpm build`, tick checklist.
```

---

## T11 — Module Spark Jobs

```
Đọc AGENTS.md và Tasks/T11-module-spark.md.

T01, T02, T03 đã hoàn thành. T03 đã có K8s client setup.
Thực thi T11: Spark Jobs module + RBAC ClusterRole trong Helm chart.

Sau khi xong: chạy `pnpm build`, tick checklist.
```

---

## T12 — RBAC + Admin Panel

```
Đọc AGENTS.md và Tasks/T12-rbac-admin.md.

T01, T02 đã hoàn thành. Các modules T04–T11 đã có (partial ok).
Thực thi T12:
1. Hoàn thiện middleware route protection cho tất cả routes
2. Tạo component <RoleGuard> và áp dụng vào T04 (nút Trigger) + T06 (query validation)
3. Trang /admin với Keycloak Admin API

Sau khi xong: chạy `pnpm build`, tick checklist.
```

---

## T13 — Dashboard

```
Đọc AGENTS.md và Tasks/T13-dashboard.md.

T01–T12 đã hoàn thành. Thực thi T13: Dashboard tổng quan landing page.

Lưu ý quan trọng:
- Dùng Promise.allSettled() cho aggregate API — không để một service down làm crash toàn trang
- Cards load độc lập (Suspense), không chờ nhau
- Health auto-refresh mỗi 60 giây

Sau khi xong: chạy `pnpm build`, tick toàn bộ checklist T13. Đây là task cuối cùng.
```

---

## Prompt debug khi stuck

Nếu Claude Code gặp lỗi và không tự giải quyết được:

```
Tôi đang gặp lỗi sau khi thực thi [TÊN TASK]:

[PASTE ERROR MESSAGE]

File liên quan: [TÊN FILE]

Phân tích nguyên nhân và đề xuất fix. Không tự ý thay đổi logic ngoài phạm vi lỗi này.
```

---

## Thứ tự sprint đề xuất

```
Sprint 1 — Foundation (ngày 1-2)
  T01 → T02 → T03

Sprint 2 — Core value modules (ngày 3-5)
  T04 (Airflow) → T05 (Catalog) → T06 (SQL Editor)

Sprint 3 — Secondary modules (ngày 6-8)
  T07 (Jupyter) → T09 (MinIO) → T11 (Spark)

Sprint 4 — Advanced (ngày 9-10)
  T08 (Kafka) → T10 (Grafana) → T12 (RBAC)

Sprint 5 — Finish (ngày 11)
  T13 (Dashboard)
```

**Lưu ý:** T08 và T10 có dependency infra (Kafka endpoint + Grafana embedding).
Nếu infra chưa sẵn sàng, skip và quay lại sau.
