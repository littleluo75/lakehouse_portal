# Module Data Catalog (OpenMetadata)

## 1. Mục Đích
Module **Data Catalog** đóng vai trò là danh mục tài sản dữ liệu trung tâm, cho phép người dùng tra cứu bảng (tables), lược đồ cột (columns), thuật ngữ kinh doanh (glossary), và theo dõi gia phả dữ liệu (lineage) được thu thập từ Trino, StarRocks và MinIO.

## 2. Vai Trò Được Phép Truy Cập (RBAC)
- `DE` (Data Engineer)
- `DS` (Data Scientist)
- `DA` (Data Analyst)
- `BA` (Business Analyst)
- `Admin`
- `SuperAdmin`

## 3. Dịch Vụ Tích Hợp
- **Tên dịch vụ:** OpenMetadata Server API v1
- **Internal URL thực tế:** `http://openmetadata.openmetadata.svc.cluster.local:8585/api/v1` (từ `INTERNAL_OPENMETADATA`)
- **Cơ chế xác thực:** Basic Auth ẩn phía server (`admin`/`admin`), hoàn toàn giấu kín không lộ ra client bundle. *(Ghi chú kỹ thuật: Có `TODO` trong `src/lib/services/index.ts` chờ chuyển sang Bearer OIDC sau khi PR-4 hoàn tất).*

## 4. BFF API Routes
Được khai báo tại `src/app/api/openmetadata/`:
- **`GET /api/openmetadata/search?q={query}`**: Gọi tới endpoint `/search/query` của OpenMetadata (OpenSearch backend) để tìm kiếm full-text các tài sản dữ liệu.
- **`GET /api/openmetadata/tables`**: Truy vấn chi tiết thông tin bảng và danh sách các cột (`fields=columns`).
- **`GET /api/openmetadata/glossaries`**: Lấy danh sách từ điển thuật ngữ kinh doanh.

## 5. Known Limitations & Gotchas
- **Cơ chế Fallback cho Lineage:** Giao diện xem Lineage đồ họa (Graph UI) phức tạp của OpenMetadata thường phụ thuộc vào các script và tài nguyên tĩnh nội bộ của riêng nó. VDP Portal sử dụng iframe để render trực tiếp hoặc hiển thị text fallback nếu OpenMetadata chặn hiển thị nhúng.
- **Vấn đề phân quyền chi tiết (Row/Column-level Security):** Do BFF hiện đang dùng chung tài khoản service admin (`admin`/`admin`) để query API OpenMetadata, mọi người dùng có quyền vào route `/catalog` sẽ nhìn thấy toàn bộ metadata danh mục tài sản giống nhau. Việc kiểm soát quyền theo từng table sẽ có hiệu lực khi chuyển hẳn sang cơ chế truyền Bearer Token của người dùng.
