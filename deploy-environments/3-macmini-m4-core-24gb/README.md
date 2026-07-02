# Môi trường 3: Dev Core Only trên Mac Mini M4 (RAM 24GB Unified Memory)

Môi trường này được thiết kế tối ưu cho máy tính **Mac Mini chip Apple Silicon M4 (ARM64) với 24GB RAM**. Vì trên macOS, RAM được chia sẻ chung giữa CPU và GPU (Unified Memory), stack này chỉ khởi chạy **Core Only** (MinIO, Postgres, Keycloak, Nessie, Trino Coordinator) với mức trần RAM được giới hạn nghiêm ngặt tổng cộng ~4.5GB - 5GB RAM, giúp macOS không bị swap ổ cứng SSD mà vẫn đầy đủ tính năng xác thực và truy vấn SQL Data Lakehouse cho webapp.

---

## 1. Cấu hình Docker Desktop (macOS Apple Silicon)

Trong mục **Settings -> Resources -> Advanced** của Docker Desktop trên macOS:
- **Memory**: Khuyến nghị đặt `8 GB` hoặc `10 GB`.
- **CPUs**: Đặt `4` hoặc `6`.
- Bật tính năng **Use Rosetta for x86/amd64 emulation on Apple Silicon** (nếu có container chưa có image native arm64).

---

## 2. Cấu hình DNS (`/etc/hosts`)

Mở Terminal trên macOS và chạy lệnh:
```bash
sudo nano /etc/hosts
```
Thêm dòng sau:
```text
127.0.0.1 portal.lakehouse.local keycloak.lakehouse.local trino.lakehouse.local nessie.lakehouse.local minio.lakehouse.local
```

---

## 3. Khởi chạy Core Stack

Mở Terminal tại thư mục này và chạy:
```bash
cd deploy-environments/3-macmini-m4-core-24gb
docker compose up -d
```

---

## 4. Chạy Webapp `vdp-portal`

Copy cấu hình env vào webapp:
```bash
cp deploy-environments/3-macmini-m4-core-24gb/.env.macm4.local vdp-portal/.env.local

cd vdp-portal
pnpm dev
```
Truy cập: `http://portal.lakehouse.local:3000`
