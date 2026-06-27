# Module Data Streams (Kafka Monitor)

## 1. Mục Đích
Module **Data Streams** cung cấp góc nhìn giám sát sức khỏe cụm luồng dữ liệu thời gian thực (Apache Kafka), cho phép theo dõi các Topics, Partitions, Consumer Groups và độ trễ (Consumer Lag).

## 2. Vai Trò Được Phép Truy Cập (RBAC)
- `DE` (Data Engineer)
- `Op` (Data Operator)
- `Admin`
- `SuperAdmin`

## 3. Kịch Bản Triển Khai & Dịch Vụ Tích Hợp
Trong hệ thống hạ tầng hiện tại (`lakehouse_infra`), module Kafka được triển khai theo **Kịch bản C (Placeholder rõ ràng / MOCK UI)** do cụm Kafka chính thức đang trong quá trình chuyển giao sang hệ thống Strimzi Operator riêng biệt.

- **Dịch vụ tích hợp tương lai:** Kafka UI REST API hoặc KafkaJS direct broker connection.
- **Trạng thái hiện tại:** Hiển thị giao diện mô phỏng giám sát luồng dữ liệu thời gian thực (UI Mockup với dữ liệu mẫu rõ ràng) để người dùng làm quen với luồng thao tác.

## 4. BFF API Routes
Hiện tại giao diện tải dữ liệu thông qua state tĩnh hoặc route giả lập trong UI component (`src/components/modules/streams/`). Khi hạ tầng Kafka sẵn sàng, các route BFF sẽ được khai báo tại `src/app/api/streams/`:
- **`GET /api/streams/topics`**: Lấy danh sách Topics và chỉ số thông lượng.
- **`GET /api/streams/consumers`**: Lấy danh sách Consumer Groups và Lag metrics.

## 5. Known Limitations & Gotchas
- **⚠️ Chưa implement backend kết nối thực tế:** Xem issue theo dõi hạ tầng để biết thời điểm tích hợp Kafka endpoints thực tế. Giao diện hiện tại có thông báo rõ ràng về trạng thái Mock/Placeholder để tránh nhầm lẫn cho người vận hành.
