# Module Spark Jobs (K8s Spark Operator)

## 1. Mục Đích
Module **Spark Jobs** cung cấp giao diện theo dõi, phân tích và quản lý các tác vụ xử lý dữ liệu quy mô lớn chạy trên engine Apache Spark bên trong Kubernetes.

## 2. Vai Trò Được Phép Truy Cập (RBAC)
- `DE` (Data Engineer)
- `Op` (Data Operator)
- `Admin`
- `SuperAdmin`

## 3. Dịch Vụ Tích Hợp
- **Tên dịch vụ:** Google Cloud Spark Operator for Kubernetes
- **Cơ chế truy vấn:** Sử dụng `@kubernetes/client-node` gọi trực tiếp vào K8s API Server thông qua in-cluster ServiceAccount.
- **Tài nguyên CRD:** `sparkapplications.sparkoperator.k8s.io/v1beta2` trong namespace `default` (hoặc `spark-jobs`).

## 4. BFF API Routes
Được định nghĩa tại `src/app/api/spark/`:
- **`GET /api/spark/jobs`**: Truy vấn danh sách các `SparkApplication` resources từ Kubernetes API. Trả về metadata gồm tên job, trạng thái execution (`RUNNING`, `COMPLETED`, `FAILED`), thời gian bắt đầu và kết thúc.
- **Tính toán Duration:** Thời gian chạy được BFF tự động tính toán chuẩn xác từ chênh lệch giữa chuỗi timestamp `lastTransitionTime` / `submissionTime` và `terminationTime`.

## 5. Known Limitations & Gotchas
- **K8s RBAC Permissions:** Để Pod VDP Portal có quyền truy vấn các object `SparkApplication` trong Cluster, Helm Chart của Portal phải gắn `ServiceAccount` đi kèm với `ClusterRole` và `ClusterRoleBinding` cấp quyền `get`, `list`, `watch` trên apiGroup `sparkoperator.k8s.io`. Nếu thiếu ClusterRoleBinding, API sẽ trả về lỗi `403 Forbidden` từ Kubernetes.
- **Spark UI Ingress Mapping:** Giao diện chi tiết của từng Spark Job khi đang chạy được định tuyến động qua Ingress theo mẫu `https://<job-name>.spark-ui.lakehouse.local`. Khi job đã hoàn thành (COMPLETED), link này có thể hết hiệu lực và cần chuyển tiếp sang Spark History Server.
