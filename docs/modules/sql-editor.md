# Module SQL Editor (Trino & StarRocks)

## 1. Mục Đích
Module **SQL Editor** cung cấp môi trường lập trình truy vấn SQL tương tác trực tiếp trên trình duyệt với cú pháp làm nổi bật (syntax highlighting), duyệt cây lược đồ dữ liệu (Catalogs -> Schemas -> Tables), và hỗ trợ xuất kết quả ra file CSV.

## 2. Vai Trò Được Phép Truy Cập (RBAC)
- `DE` (Data Engineer)
- `DS` (Data Scientist)
- `DA` (Data Analyst) — *Bị giới hạn chỉ được chạy truy vấn đọc (READ-ONLY)*.
- `Admin`
- `SuperAdmin`

## 3. Dịch Vụ Tích Hợp
Module tích hợp song song 2 query engine phân tán lớn nhất của nền tảng:
1. **Trino Engine (Interactive OLAP):**
   - **Internal URL:** `http://trino.trino.svc.cluster.local:8080`
   - **Cơ chế xác thực:** Gửi định danh người dùng qua HTTP Header `X-Trino-User`.
2. **StarRocks Engine (Data Warehouse):**
   - **Internal Endpoint:** `10.167.70.13:30030` (TCP NodePort trên Bastion/Worker).
   - **Cơ chế kết nối:** Sử dụng thư viện `mysql2` tạo Connection Pool trực tiếp từ Node.js server.

## 4. BFF API Routes
- **`POST /api/trino/query`**: Nhận câu lệnh SQL từ UI, thực thi gửi tới Trino `/v1/statement`, tự động xử lý vòng lặp polling HTTP tới `nextUri` cho đến khi truy vấn hoàn tất, trả về payload gom nhóm cột và hàng dữ liệu.
- **`POST /api/starrocks/query`**: Mở kết nối TCP tới StarRocks FE, thực thi câu lệnh qua giao thức MySQL binary protocol và trả về tập kết quả JSON.

## 5. Known Limitations & Gotchas
- **Trino HTTP Polling Timeout:** Vì giao thức HTTP polling của Trino yêu cầu gọi liên tiếp tới `nextUri`, BFF thiết lập giới hạn vòng lặp tối đa là 60 lần (khoảng 30 giây). Nếu câu lệnh SQL chạy trên Trino mất quá 30 giây để bắt đầu ra dữ liệu, BFF sẽ cắt kết nối và báo lỗi `504 Gateway Timeout`. Để chạy các job nặng hàng giờ, người dùng phải chuyển sang Spark Jobs.
- **StarRocks Connection Pool Leaks:** Kết nối TCP `mysql2` trong serverless/edge environment có thể bị cạn kiệt nếu không giải phóng `connection.release()`. Cấu hình pool trong `src/lib/services/starrocks.ts` đã đặt giới hạn `connectionLimit: 10`.
- **Kiểm soát quyền ghi của DA (Role Guard):** Việc chặn các lệnh `DROP`, `INSERT`, `UPDATE`, `ALTER` đối với vai trò `DA` hiện đang được kiểm tra bằng Regex trên chuỗi SQL tại tầng BFF/Client. Để bảo mật tuyệt đối 100%, cần cấu hình thêm phân quyền tại tầng Catalog của Trino/Nessie và user MySQL của StarRocks.
