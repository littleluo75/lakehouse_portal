# Module Observability (Grafana & Platform Health)

## 1. Mục Đích
Module **Observability** cung cấp trung tâm giám sát sức khỏe hệ thống theo thời gian thực, hiển thị trạng thái hoạt động của 6 dịch vụ nền tảng lõi và nhúng các bảng điều khiển hiệu năng chuyên sâu từ Grafana.

## 2. Vai Trò Được Phép Truy Cập (RBAC)
- `Op` (Data Operator)
- `Admin`
- `SuperAdmin`
- `PM` (Product Manager)

## 3. Dịch Vụ Tích Hợp
- **Tên dịch vụ:** Prometheus & Grafana (`kube-prometheus-stack`)
- **Internal URL thực tế:** `http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80` (từ `INTERNAL_GRAFANA`)
- **Cơ chế xác thực:** Basic Auth (`admin` / `GRAFANA_ADMIN_PASSWORD`).

## 4. BFF API Routes
Được định nghĩa tại `src/app/api/observability/` và `src/app/api/health/`:
- **`GET /api/observability/dashboards`**: Lấy danh sách Dashboards và Panel IDs thực tế từ API Grafana (`/api/search`). Dữ liệu này được làm giàu vào `src/config/grafana.ts`.
- **`GET /api/dashboard/summary` & Health Checks**: Thực hiện gọi kiểm tra sức khỏe đồng thời tới 6 dịch vụ lõi (Airflow, Trino, MinIO, OpenMetadata, JupyterHub, Grafana) bằng **`Promise.allSettled()`**. Đảm bảo nếu một dịch vụ sập, các dịch vụ khác vẫn trả về trạng thái bình thường mà không làm crash toàn trang.
- **Auto-Refresh:** Giao diện được cấu hình tự động làm mới chỉ số sức khỏe mỗi **60 giây**.

## 5. Known Limitations & Gotchas
- **Phụ thuộc Iframe Embedding (`allow_embedding`):** Để hiển thị component `<GrafanaPanel>` trực tiếp trong portal, Grafana buộc phải cấu hình `allow_embedding = true` và `cookie_samesite = none` (PR-3 hạ tầng).
- **Component Fallback:** Nếu trình duyệt của client chặn tài nguyên cross-origin iframe hoặc từ chối cookie bên thứ ba của Grafana, component `<GrafanaPanel>` sẽ tự động chuyển sang chế độ hiển thị nút link tĩnh mở dashboard sang tab mới (`Fallback View`).
