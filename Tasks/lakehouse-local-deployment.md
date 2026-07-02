# Kế Hoạch Triển Khai & Phát Triển Local (VDP Portal)

## Executive Summary
Tài liệu này xác định 2 chế độ làm việc và kiểm thử cho **VDP Portal (`lakehouse_portal`)**, phân tách rõ ràng theo môi trường của lập trình viên:
1. **Chế độ 1: Môi trường Dev tại Công ty (Remote K8s Cluster qua SSH Port Forwarding)** - Sử dụng hạ tầng đầy đủ trên RKE2 thông qua đường hầm SSH.
2. **Chế độ 2: Môi trường tại Nhà (Docker Desktop Minimum Config)** - Giả lập các dịch vụ cốt lõi bằng Docker Compose để duy trì phát triển offline/tại nhà với cấu hình tài nguyên tối thiểu.

---

## PHẦN 1: MÔI TRƯỜNG DEV TẠI CÔNG TY (SSH PORT FORWARDING)

### 1. Ứng dụng & Luồng kết nối
Trong môi trường công ty, toàn bộ dịch vụ nặng (Airflow, Trino, OpenMetadata, StarRocks, Spark, Volcano...) đang chạy trên cụm Kubernetes RKE2 HA (`10.167.70.13-15`) phía sau Bastion Host (`10.167.70.16`). Lập trình viên chạy `vdp-portal` tại máy cá nhân và kết nối trực tiếp vào cụm K8s.

### 2. Lệnh SSH Port Forwarding
Mở Terminal/PowerShell và giữ kết nối đường hầm (tunnel) tới Bastion Host:
```bash
ssh -L 443:127.0.0.1:443 -L 30030:10.167.70.13:30030 root@10.167.70.16
```
*(Mật khẩu SSH: `Provcl123@@@`)*
- **Port 443:** Đưa toàn bộ traffic HTTPS qua HAProxy -> Traefik Ingress Controller trên cụm K8s.
- **Port 30030:** Đưa traffic truy vấn SQL trực tiếp tới StarRocks FE NodePort (`10.167.70.13:30030`).

### 3. Cấu hình DNS Local (`C:\Windows\System32\drivers\etc\hosts`)
Mở Notepad với quyền **Run as Administrator** và thêm danh sách 20 endpoint chuẩn sau trỏ về `127.0.0.1`:

```text
127.0.0.1 argocd.lakehouse.local
127.0.0.1 volcano.lakehouse.local
127.0.0.1 longhorn.lakehouse.local
127.0.0.1 minio.lakehouse.local
127.0.0.1 grafana-volcano.lakehouse.local
127.0.0.1 keycloak.lakehouse.local
127.0.0.1 spark-history-batch.lakehouse.local
127.0.0.1 spark-history-connect.lakehouse.local
127.0.0.1 spark-sc-dev-spark-operator.spark-ui.lakehouse.local
127.0.0.1 airflow.lakehouse.local
127.0.0.1 jupyterhub.lakehouse.local
127.0.0.1 grafana.lakehouse.local
127.0.0.1 nessie.lakehouse.local
127.0.0.1 datahub.lakehouse.local
127.0.0.1 trino.lakehouse.local
127.0.0.1 starrocks.lakehouse.local
127.0.0.1 openmetadata.lakehouse.local
127.0.0.1 portal.lakehouse.local
127.0.0.1 ranger.lakehouse.local
127.0.0.1 rancher.lakehouse.local
```

### 4. Cấu hình biến môi trường (`vdp-portal/.env.company.local`)
Khi chạy portal trên máy cá nhân kết nối qua SSH Tunnel, các URL nội bộ (`INTERNAL_*`) phải gọi qua cổng HTTPS 443 thay vì `.svc.cluster.local`:

```ini
NODE_TLS_REJECT_UNAUTHORIZED=0

KEYCLOAK_ISSUER=https://keycloak.lakehouse.local/realms/lakehouse
KEYCLOAK_INTERNAL_URL=https://keycloak.lakehouse.local
KEYCLOAK_REALM=lakehouse
KEYCLOAK_CLIENT_ID=vdp-portal
KEYCLOAK_CLIENT_SECRET=vdp-portal-secret-key-2026

INTERNAL_AIRFLOW_API=https://airflow.lakehouse.local/api/v1
INTERNAL_TRINO_URL=https://trino.lakehouse.local
INTERNAL_NESSIE_API=https://nessie.lakehouse.local/api/v2
INTERNAL_MINIO_ENDPOINT=https://minio.lakehouse.local
INTERNAL_OPENMETADATA=https://openmetadata.lakehouse.local/api/v1
INTERNAL_JUPYTERHUB=https://jupyterhub.lakehouse.local/hub/api
INTERNAL_GRAFANA=https://grafana.lakehouse.local

STARROCKS_HOST=10.167.70.13
STARROCKS_PORT=30030
STARROCKS_USER=root
STARROCKS_PASSWORD=

NEXTAUTH_URL=https://portal.lakehouse.local
NEXTAUTH_SECRET=vdp-portal-secret-key-2026
```

---

## PHẦN 2: MÔI TRƯỜNG TẠI NHÀ (DOCKER DESKTOP MINIMUM CONFIG)

### 1. Mục tiêu & Nguyên tắc
Khi làm việc tại nhà hoặc offline, lập trình viên sử dụng `docker-compose.yml` để khởi chạy các dịch vụ thiết yếu nhất với cấu hình tối thiểu (Minimum Resources):
- **Core Stack:** Traefik (Proxy), Keycloak + Postgres (Auth), MinIO (Storage).
- **Data Stack:** Nessie + Postgres (Catalog), Trino (Engine), StarRocks FE.
- **Bỏ qua (Mock):** OpenMetadata, Spark Operator, Volcano (do nặng tài nguyên và phụ thuộc K8s).

### 2. Cấu hình biến môi trường (`vdp-portal/.env.docker.local`)
Khi portal chạy local cùng mạng Docker Compose (`lakehouse-net`), gọi trực tiếp qua tên container trên cổng HTTP 80:

```ini
KEYCLOAK_ISSUER=http://keycloak.lakehouse.local/realms/lakehouse
KEYCLOAK_INTERNAL_URL=http://keycloak:8080
KEYCLOAK_REALM=lakehouse
KEYCLOAK_CLIENT_ID=vdp-portal
KEYCLOAK_CLIENT_SECRET=vdp-portal-secret-key-2026

INTERNAL_AIRFLOW_API=http://airflow-webserver:8080/api/v1
INTERNAL_TRINO_URL=http://trino:8080
INTERNAL_NESSIE_API=http://nessie:19120/api/v2
INTERNAL_MINIO_ENDPOINT=http://minio:9000
INTERNAL_GRAFANA=http://grafana:3000

PUBLIC_AIRFLOW_URL=http://airflow.lakehouse.local
PUBLIC_GRAFANA_URL=http://grafana.lakehouse.local
PUBLIC_OPENMETADATA_URL=http://openmetadata.lakehouse.local

NEXTAUTH_URL=http://portal.lakehouse.local
NEXTAUTH_SECRET=vdp-portal-secret-key-2026
```

### 3. Lệnh khởi chạy Docker Desktop Minimum
```bash
# 1. Khởi động các dịch vụ cốt lõi
docker compose up -d traefik minio minio-init keycloak-db keycloak nessie-db nessie trino starrocks-fe

# 2. Khởi chạy VDP Portal
cd vdp-portal && pnpm dev
```

---

## PHẦN 3: BẢNG KIỂM CHỨNG & TIÊU CHÍ CHẤP THUẬN (ACCEPTANCE CRITERIA)

| Hạng mục kiểm tra | Chế độ Công ty (SSH Tunnel) | Chế độ Nhà (Docker Compose) | Tiêu chí Đạt (PASS) |
|---|---|---|---|
| **Phân giải DNS** | `ping keycloak.lakehouse.local` | `ping keycloak.lakehouse.local` | Trả về `127.0.0.1` |
| **Xác thực SSO** | Login qua `https://keycloak...` | Login qua `http://keycloak...` | OIDC Token hợp lệ, trả về roles |
| **BFF Proxy Trino** | Gọi API `/api/trino/v1/info` | Gọi API `/api/trino/v1/info` | HTTP 200 OK |
| **StarRocks SQL** | Kết nối `10.167.70.13:30030` | Kết nối `localhost:9030` | Query thành công |
