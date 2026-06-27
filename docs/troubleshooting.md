# Cẩm Nang Xử Lý Sự Cố VDP Portal (Troubleshooting Guide)

Tài liệu này tổng hợp các sự cố thực tế thường gặp trong quá trình vận hành Cổng thông tin hợp nhất **VDP Portal**, nguyên nhân cốt lõi theo kiến trúc và phương án giải quyết dứt điểm.

---

## 1. Iframe Grafana hoặc Airflow Hiển Thị Trắng Trang (Refused to Connect)

### Nguyên nhân:
Trình duyệt chặn tải nội dung trang web nhúng do cấu hình bảo mật `X-Frame-Options: DENY` hoặc `Content-Security-Policy: frame-ancestors 'none'` trả về từ máy chủ Grafana/Airflow nội bộ.

### Phương án khắc phục:
- **Đối với Grafana:** Kiểm tra đã merge **PR-3** trong hạ tầng. Đảm bảo file cấu hình `grafana.ini` có đoạn:
  ```ini
  [security]
  allow_embedding = true
  cookie_secure = true
  cookie_samesite = none
  ```
- **Đối với Airflow:** Kiểm tra **PR-2** trong hạ tầng. Đảm bảo biến môi trường `AIRFLOW__WEBSERVER__X_FRAME_OPTIONS` được thiết lập thành `SAMEORIGIN` (khi chạy cùng miền `*.lakehouse.local`) hoặc để rỗng.

---

## 2. Lỗi CORS (Cross-Origin Resource Sharing) Khi Test Local

### Nguyên nhân:
Lập trình viên khi test local viết code frontend (React component) sử dụng `fetch()` gọi thẳng tới ClusterIP của Airflow hoặc MinIO (ví dụ: `http://airflow-webserver...:8080/api/v1/dags`). Do khác origin (máy dev là `localhost:3000` còn backend là URL cụm K8s), trình duyệt chặn request ngay lập tức.

### Phương án khắc phục:
Luôn ghi nhớ nguyên tắc vàng của mô hình **BFF**: Trình duyệt **không bao giờ** gọi trực tiếp ra ngoài. Hãy gọi thông qua API Route của Next.js:
- **Sai:** `fetch('http://airflow...:8080/api/v1/dags')`
- **Đúng:** `fetch('/api/airflow/dags')` (BFF server sẽ nhận request và thực hiện HTTP forward từ server bên trong K8s ra sau).

---

## 3. Lỗi Keycloak Token Expired (401 Unauthorized Liên Tục)

### Nguyên nhân:
Access Token cấp phát từ Keycloak có thời hạn ngắn (mặc định 5 hoặc 15 phút). Nếu tiến trình làm mới token tự động (`jwt` callback trong `src/lib/auth.ts`) gặp lỗi kết nối tới Keycloak ClusterIP hoặc refresh token đã hết hạn, các request gởi đi bị từ chối với status `401`.

### Cách debug & khắc phục:
1. Kiểm tra log của Pod VDP Portal xem có lỗi `RefreshAccessTokenError`:
   ```bash
   kubectl logs -n vdp-portal -l app.kubernetes.io/name=vdp-portal --tail=100 | grep -i refresh
   ```
2. Đảm bảo biến môi trường `KEYCLOAK_INTERNAL_URL` có thể phân giải được từ bên trong Pod portal.
3. **Force Refresh:** Yêu cầu người dùng đăng xuất và đăng nhập lại để nhận cặp Session/Refresh Token mới từ Keycloak.

---

## 4. Trino Query Bị Timeout (504 Gateway Timeout)

### Nguyên nhân:
Trino sử dụng giao thức HTTP Polling bất đồng bộ. Mặc định trong hàm `src/lib/services/trino.ts`, BFF thực hiện lặp lại tối đa 60 lần (chu kỳ 500ms ~ tổng thời gian chờ 30 giây). Nếu câu lệnh SQL truy vấn trên tập dữ liệu lớn (Big Data Iceberg table) mất hơn 30 giây để hoàn thành, BFF sẽ ngắt kết nối và ném lỗi `504 Request timeout`.

### Phương án khắc phục:
- **Tăng giới hạn timeout ngắn hạn:** Sửa tham số `maxRetries` hoặc `delayMs` trong file `src/lib/services/trino.ts` (ví dụ lên 120 lần ~ 60 giây).
- **Giải pháp dài hạn:** Với các truy vấn OLAP nặng kéo dài hàng phút hoặc hàng giờ, hướng dẫn người dùng chuyển sang sử dụng module **Spark Jobs** (`/jobs`) thay vì chạy trực tiếp qua SQL Editor tương tác.

---

## 5. K8s CRD Permission Denied (403 Forbidden Khi Truy Vấn Spark Jobs)

### Nguyên nhân:
Khi truy cập module `/jobs`, BFF báo lỗi `Service unavailable: 403 Forbidden`. Đây là do ServiceAccount gắn với Pod VDP Portal không được cấp quyền truy vấn vào Kubernetes API Server đối với tài nguyên `SparkApplication`.

### Phương án khắc phục:
Kiểm tra cấu hình Helm Chart trong `vdp_portal/helm/templates/rbac.yaml`. Đảm bảo đã khai báo đầy đủ ClusterRoleBinding:
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: vdp-portal-spark-reader
rules:
  - apiGroups: ["sparkoperator.k8s.io"]
    resources: ["sparkapplications"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: vdp-portal-spark-reader-binding
subjects:
  - kind: ServiceAccount
    name: vdp-portal
    namespace: vdp-portal
roleRef:
  kind: ClusterRole
  name: vdp-portal-spark-reader
  apiGroup: rbac.authorization.k8s.io
```

---

## 6. MinIO Presigned URL Bị Hết Hạn Hoặc Lỗi Access Denied

### Nguyên nhân:
Đường dẫn tải xuống Presigned URL tạo ra từ `/api/storage/presign` có thời hạn mặc định là **3600 giây (1 giờ)**. Sau thời gian này, đường dẫn trở nên vô hiệu. Ngoài ra, nếu URL được ký bằng Hostname nội bộ (`http://minio.minio.svc...`), trình duyệt từ máy người dùng bên ngoài sẽ không thể kết nối được.

### Phương án khắc phục:
- Đảm bảo client S3 (`@aws-sdk/client-s3`) khi khởi tạo Presigned URL sử dụng đúng endpoint công cộng có thể truy cập từ client (ví dụ `https://minio.lakehouse.local`) hoặc cấu hình NAT/Host rewriting chuẩn xác.
- Điều chỉnh tham số `expiresIn` trong lời gọi hàm `getSignedUrl()` nếu muốn kéo dài thời gian hiệu lực của link tải xuống.

---

## 7. StarRocks Connection Refused (Lỗi Kết Nối TCP 30030)

### Nguyên nhân:
Module SQL Editor khi thực thi truy vấn StarRocks báo lỗi `Error: connect ECONNREFUSED 10.167.70.13:30030`. Đây là do Pod VDP Portal không thể thiết lập socket TCP tới cấu hình NodePort của StarRocks FrontEnd (FE).

### Phương án khắc phục:
1. Kiểm tra dịch vụ StarRocks FE trong K8s Cluster xem NodePort `30030` có đang mở hay không:
   ```bash
   kubectl get svc -n starrocks starrocks-fe-service
   ```
2. Kiểm tra tường lửa (Firewall/iptables) trên máy Bastion hoặc Worker Node `10.167.70.13`.
3. Đảm bảo cấu hình kết nối trong `.env.local` (`STARROCKS_HOST` và `STARROCKS_PORT`) phản ánh đúng IP có thể reach được từ network của Pod Portal.
