# Môi trường 1: Kết nối Hạ tầng thật RKE2 Cluster (*.local endpoint)

Môi trường này dành cho việc phát triển webapp (`vdp-portal`) trên máy cá nhân nhưng kết nối trực tiếp đến các dịch vụ đang chạy trên cụm Kubernetes thật (`lakehouse_infra`) thông qua SSH Tunnel hoặc mạng nội bộ. **Không cần cài đặt hay chạy bất kỳ container Docker nào trên máy cá nhân.**

---

## 1. Cấu hình DNS Local (`C:\Windows\System32\drivers\etc\hosts` hoặc `/etc/hosts`)

Mở file hosts với quyền Administrator (hoặc `sudo nano /etc/hosts`) và thêm dòng sau để trỏ các tên miền K8s Ingress về `127.0.0.1` (khi dùng SSH Tunnel):

```text
# Lakehouse Remote K8s Cluster via SSH Tunnel
127.0.0.1 portal.lakehouse.local keycloak.lakehouse.local trino.lakehouse.local nessie.lakehouse.local minio.lakehouse.local airflow.lakehouse.local grafana.lakehouse.local openmetadata.lakehouse.local jupyterhub.lakehouse.local starrocks.lakehouse.local
```

---

## 2. Mở kết nối SSH Port Forwarding (SSH Tunnel)

Chạy script `connect-ssh-tunnel.ps1` đính kèm (hoặc chạy lệnh SSH sau trong PowerShell/Terminal) để map các cổng dịch vụ K8s qua Bastion Host (`10.167.70.16`):

```powershell
ssh -N `
  -L 443:127.0.0.1:443 `
  -L 8080:10.167.70.13:30080 `
  -L 30030:10.167.70.13:30030 `
  root@10.167.70.16
```

*(Lưu ý: Thay đổi IP/Port tùy theo cấu hình cụm thực tế của bạn).*

---

## 3. Chạy Webapp `vdp-portal`

Copy file cấu hình môi trường `.env.remote.local` vào thư mục gốc `vdp-portal/.env.local`:

```powershell
# Từ thư mục gốc lakehouse_portal
Copy-Item .\deploy-environments\1-remote-k8s-cluster\.env.remote.local .\vdp-portal\.env.local

# Khởi chạy Next.js
cd vdp-portal
pnpm dev
```

Truy cập trình duyệt tại: `https://portal.lakehouse.local` (hoặc `http://portal.lakehouse.local:3000`).
