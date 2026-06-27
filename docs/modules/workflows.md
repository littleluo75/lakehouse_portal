# Module Workflows (Apache Airflow)

## 1. Mục Đích
Module **Workflows** cung cấp giao diện quản lý, giám sát và điều hướng các luồng dữ liệu (DAGs - Directed Acyclic Graphs) của hệ thống Apache Airflow ngay trên VDP Portal.

## 2. Vai Trò Được Phép Truy Cập (RBAC)
- `DE` (Data Engineer)
- `Op` (Data Operator)
- `Admin`
- `SuperAdmin`

## 3. Dịch Vụ Tích Hợp
- **Tên dịch vụ:** Apache Airflow REST API v1
- **Internal URL thực tế:** `http://airflow-webserver.airflow.svc.cluster.local:8080/api/v1` (từ `INTERNAL_AIRFLOW_API`)
- **Cơ chế xác thực:** Forward Bearer Access Token lấy từ phiên đăng nhập Keycloak (`session.accessToken`).

## 4. BFF API Routes
Tất cả các API được ánh xạ trong thư mục `src/app/api/airflow/`:
- **`GET /api/airflow/dags`**: Lấy danh sách toàn bộ DAGs trong hệ thống (kèm thông tin trạng thái, tag, lịch chạy).
- **`POST /api/airflow/dags`**: Thực thi trigger một DAG với tùy chọn truyền cấu hình JSON (`conf`). Nút thao tác này được bảo vệ bởi component `<RoleGuard>`.
- **`PATCH /api/airflow/dags`**: Thay đổi trạng thái tạm dừng hoặc kích hoạt (`is_paused`: true/false) của DAG.

## 5. Known Limitations & Gotchas
- **X-Frame-Options Gotcha:** Khi người dùng bấm vào chi tiết DAG mở iframe hoặc sang tab mới, webserver Airflow phải được cấu hình `AIRFLOW__WEBSERVER__X_FRAME_OPTIONS="SAMEORIGIN"` (hoặc tắt) trong PR-2 của hạ tầng; nếu không, trình duyệt sẽ từ chối tải giao diện Airflow bên trong iframe của Portal.
- **Token Expiry Sync:** Do Airflow xác thực bằng JWT OIDC từ Keycloak, nếu thời gian lệch giờ (Clock Skew) giữa pod VDP Portal và pod Airflow vượt quá 60 giây, request có thể bị trả về lỗi `401 Unauthorized`.
