# Môi trường 2: Dev Full Ecosystem trên Máy Windows 11 (PC 64GB RAM)

Môi trường này khởi chạy **toàn bộ hệ sinh thái Lakehouse** (Trino, StarRocks, Airflow, OpenMetadata, Nessie, MinIO, Keycloak, Grafana) ngay trên Docker Desktop Windows 11. Với cấu hình PC 64GB RAM, các container được cấp phát tổng cộng ~16GB - 18GB RAM để hoạt động mượt mà đầy đủ tính năng.

---

## 1. Cấu hình WSL2 (`C:\Users\<Tên-User>\.wslconfig`)

Khuyến nghị cấu hình WSL2 cấp 24GB RAM cho Docker Desktop:
```ini
[wsl2]
memory=24GB
processors=8
swap=8GB
```
Sau đó mở PowerShell chạy: `wsl --shutdown` và mở lại Docker Desktop.

---

## 2. Cấu hình DNS (`C:\Windows\System32\drivers\etc\hosts`)

Mở file hosts với quyền Administrator và thêm dòng sau:
```text
127.0.0.1 portal.lakehouse.local keycloak.lakehouse.local trino.lakehouse.local nessie.lakehouse.local minio.lakehouse.local airflow.lakehouse.local grafana.lakehouse.local openmetadata.lakehouse.local starrocks.lakehouse.local
```

---

## 3. Khởi chạy Full Ecosystem Stack

Chạy lệnh docker compose trong thư mục này:
```powershell
cd deploy-environments/2-win11-full-ecosystem-64gb
docker compose up -d
```

---

## 4. Chạy Webapp `vdp-portal`

Copy file `.env.win11.local` vào gốc `vdp-portal/.env.local`:
```powershell
Copy-Item .\deploy-environments\2-win11-full-ecosystem-64gb\.env.win11.local .\vdp-portal\.env.local

cd vdp-portal
pnpm dev
```
Truy cập: `http://portal.lakehouse.local:3000`
