# Module Storage Browser (MinIO S3)

## 1. Mục Đích
Module **Storage Browser** hoạt động như một trình quản lý tệp tin trực quan cho kho lưu trữ đối tượng MinIO S3 của nền tảng, hỗ trợ duyệt cây thư mục ảo, sao chép đường dẫn chuẩn S3 và tạo đường dẫn tải xuống an toàn (Presigned URL).

## 2. Vai Trò Được Phép Truy Cập (RBAC)
- `DE` (Data Engineer)
- `DS` (Data Scientist)
- `Op` (Data Operator)
- `Admin`
- `SuperAdmin`

## 3. Dịch Vụ Tích Hợp
- **Tên dịch vụ:** MinIO Object Storage (S3 Compatible API)
- **Internal URL thực tế:** `http://minio.minio.svc.cluster.local:9000` (từ `INTERNAL_MINIO_ENDPOINT`)
- **Cấu hình kết nối:** Sử dụng `@aws-sdk/client-s3` với tùy chọn bắt buộc **`forcePathStyle: true`** (để định tuyến theo chuẩn `http://endpoint/bucket/key` thay vì virtual-host style của AWS).

## 4. BFF API Routes
Được định nghĩa tại `src/app/api/minio/` hoặc trong service layer `src/lib/services/minio.ts`:
- **`GET /api/storage/buckets`**: Liệt kê tất cả các bucket hiện có trên MinIO cluster (`listBuckets`).
- **`GET /api/storage/objects?bucket={b}&prefix={p}`**: Duyệt danh sách file trong bucket theo tiền tố prefix. Phân biệt rõ ràng giữa **Folder ảo** (trả về trong mảng `CommonPrefixes`) và **File dữ liệu** (trả về trong mảng `Contents`).
- **`POST /api/storage/presign`**: Tạo Presigned Download URL có thời hạn cho phép trình duyệt tải file trực tiếp mà không cần đi qua proxy stream của portal.

## 5. Known Limitations & Gotchas
- **Presigned URL Expiry:** Đường dẫn tải xuống được ký bằng `s3-request-presigner` có thời gian hết hạn mặc định là **3600 giây (1 giờ)**. Do URL chứa địa chỉ endpoint nội bộ hoặc external qua Ingress, cần đảm bảo domain ký (`INTERNAL_MINIO_ENDPOINT` hoặc Public MinIO URL) khớp với mạng của client tải xuống.
- **Tính toán kích thước file:** Giao diện sử dụng hàm tiện ích `formatBytes` trong `src/lib/utils.ts` để hiển thị kích thước đọc được (KB, MB, GB, TB) chuẩn xác theo hệ cơ số 1024.
