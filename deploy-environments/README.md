# Hồ Sơ Cấu Hình Triển Khai Môi Trường Phát Triển Webapp (`vdp-portal`)

Thư mục này tổng hợp các cấu hình triển khai và chạy công cụ cục bộ cho webapp `vdp-portal`, được chia thành 3 kịch bản theo đúng nhu cầu và tài nguyên phần cứng của bạn:

---

## 📁 Danh Sách Các Môi Trường

### 1️⃣ [1-remote-k8s-cluster](./1-remote-k8s-cluster) (Kết nối Hạ tầng thật qua SSH Tunnel)
- **Đối tượng**: Phát triển webapp kết nối thẳng tới các endpoint `*.lakehouse.local` trên cụm Kubernetes thật (`lakehouse_infra`).
- **Cài đặt công cụ**: **Không cần chạy Docker local**.
- **Cách hoạt động**: Cấu hình file `hosts` trỏ về `127.0.0.1` và chạy script PowerShell `connect-ssh-tunnel.ps1` để forward port từ Bastion Host.

---

### 2️⃣ [2-win11-full-ecosystem-64gb](./2-win11-full-ecosystem-64gb) (Dev Full Ecosystem trên Windows 11 - 64GB RAM)
- **Đối tượng**: Máy tính Windows 11 cấu hình mạnh (64GB RAM), muốn chạy trọn bộ toàn bộ hệ sinh thái Data Lakehouse ngay trên Docker Desktop local.
- **Các Service được dựng**: Postgres, Keycloak, MinIO, Nessie, Trino, StarRocks OLAP, Airflow, OpenSearch + OpenMetadata, Grafana.
- **Tài nguyên Docker tiêu thụ**: ~16GB - 18GB RAM (khuyến nghị set WSL2 `memory=24GB`).

---

### 3️⃣ [3-macmini-m4-core-24gb](./3-macmini-m4-core-24gb) (Dev Core Only trên Mac Mini M4 - 24GB RAM)
- **Đối tượng**: Máy tính Apple Silicon M4 với 24GB Unified Memory. Cần tối ưu để macOS vừa mượt mà vừa dev được đầy đủ tính năng SQL & IAM cho webapp.
- **Các Service được dựng (Core Only)**: Postgres, Keycloak SSO, MinIO Object Storage, Nessie Catalog, Trino Coordinator.
- **Tài nguyên Docker tiêu thụ**: Siêu nhẹ ~4.5GB - 5GB RAM (khuyến nghị cấp cho Docker Desktop 8GB - 10GB).

---

## 🛠 Cách sử dụng nhanh cho từng môi trường

Mỗi thư mục con đều có:
1. File `README.md` chi tiết từng bước (Cấu hình `hosts`, cấu hình RAM/WSL2).
2. File `docker-compose.yml` (hoặc script SSH tunnel).
3. File `.env.<tên-môi-trường>.local` chuẩn. Bạn chỉ cần copy đè vào `vdp-portal/.env.local` và khởi chạy `pnpm dev`.
