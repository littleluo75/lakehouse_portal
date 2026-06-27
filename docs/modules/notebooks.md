# Module Notebooks (JupyterHub)

## 1. Mục Đích
Module **Notebooks** cho phép các nhà khoa học dữ liệu (Data Scientists) và kỹ sư dữ liệu khởi tạo, theo dõi trạng thái và truy cập vào môi trường lập trình tương tác JupyterLab được cấp phát riêng rẽ bên trong cụm Kubernetes.

## 2. Vai Trò Được Phép Truy Cập (RBAC)
- `DE` (Data Engineer)
- `DS` (Data Scientist)
- `Admin`
- `SuperAdmin`

## 3. Dịch Vụ Tích Hợp
- **Tên dịch vụ:** JupyterHub Hub REST API
- **Internal URL thực tế:** `http://hub.jupyter.svc.cluster.local:8081/hub/api` (từ `INTERNAL_JUPYTERHUB`)
- **Cơ chế xác thực:** Forward Bearer Access Token của người dùng đang đăng nhập.

## 4. BFF API Routes
Được định nghĩa tại `src/app/api/jupyter/`:
- **`GET /api/jupyter/status`**: Lấy trạng thái máy chủ server notebook cá nhân của người dùng. Trả về 3 trạng thái chuẩn hóa: `stopped`, `starting`, hoặc `running`. Đặc biệt, `username` được trích xuất an toàn từ session token trên server chứ không nhận từ body client.
- **`POST /api/jupyter/start`**: Gửi yêu cầu cấp phát Pod JupyterLab mới cho user. Tùy chọn truyền tham số profile sizing (ví dụ: profile nhỏ cho DA/Viewer, profile có GPU/RAM lớn cho DS).
- **`POST /api/jupyter/stop`**: Gửi lệnh tắt server cá nhân để giải phóng tài nguyên CPU/RAM cho K8s Cluster.

## 5. Known Limitations & Gotchas
- **Trạng thái `starting` polling:** Khi người dùng bấm khởi chạy, quá trình cấp phát K8s Pod (pull image, attach PVC volume) có thể mất từ 10 - 30 giây. Giao diện UI thực hiện tự động gọi lại `/api/jupyter/status` mỗi 3 giây một lần cho đến khi trạng thái chuyển sang `running`.
- **Đường dẫn nhúng/truy cập ngoại vi:** JupyterLab yêu cầu truy cập trực tiếp qua tên miền công cộng để hỗ trợ WebSocket (`https://jupyterhub.lakehouse.local/user/{username}/lab`). Link này được tạo ra và trả về từ API trạng thái.
