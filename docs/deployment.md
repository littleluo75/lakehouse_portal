# Hướng Dẫn Triển Khai VDP Portal (Deployment Guide)

Tài liệu này cung cấp hướng dẫn từng bước để đóng gói, cấu hình và triển khai VDP Portal lên cụm Kubernetes RKE2 Bare-metal theo mô hình GitOps (ArgoCD) hoặc triển khai thủ công qua Helm.

---

## 1. Yêu Cầu Tiền Đề Hạ Tầng (Infrastructure Prerequisites)

Trước khi triển khai VDP Portal vào môi trường thực tế, đảm bảo **5 Pull Requests (PRs)** sau đã được merge và đồng bộ vào kho lưu trữ hạ tầng (`lakehouse_infra`):

1. **PR-1: Cấu hình Keycloak Client (`vdp-portal`):**
   - Khởi tạo Client ID `vdp-portal` trong Realm `lakehouse`.
   - Bật chuẩn OIDC Authorization Code Flow, bật Client Authentication (Secret).
   - Valid Redirect URIs: `https://portal.lakehouse.local/*`, `http://localhost:3000/*`.
   - Web Origins: `https://portal.lakehouse.local`.
   - Thêm Protocol Mapper ánh xạ Realm Roles vào claim `realm_access.roles` trong Access Token/ID Token.
2. **PR-2: Cho phép nhúng Airflow Iframe:**
   - Cấu hình biến môi trường Airflow Webserver: `AIRFLOW__WEBSERVER__X_FRAME_OPTIONS="SAMEORIGIN"` (hoặc loại bỏ header nếu nhúng từ sub-domain).
3. **PR-3: Cho phép nhúng Grafana Dashboard (`allow_embedding`):**
   - Cấu hình trong `grafana.ini`:
     ```ini
     [security]
     allow_embedding = true
     cookie_secure = true
     cookie_samesite = none
     ```
4. **PR-4: Kích hoạt OIDC cho OpenMetadata:**
   - Cấu hình `authenticationConfiguration` của OpenMetadata chuyển từ Basic Auth sang Keycloak SSO, đồng bộ user/role tự động.
5. **PR-5: Thư mục Helm Chart (`vdp_portal/`):**
   - Đưa cấu trúc Helm chart vào thư mục deployment của GitOps để ArgoCD nhận diện.

---

## 2. Đóng Gói Docker Image (Multi-stage Build)

VDP Portal sử dụng Dockerfile tối ưu hóa theo mô hình `standalone` của Next.js, giúp giảm kích thước image xuống dưới 150MB.

### Thực hiện build image:
```bash
cd lakehouse_portal/vdp-portal
docker build -t vdp-portal:latest .
```

### Triển khai trong môi trường Air-gapped RKE2 (Không có Internet):
Xuất image ra file nén và chuyển lên các node K8s thông qua SCP:
```bash
# Nén image
docker save vdp-portal:latest | gzip > vdp-portal.tar.gz

# Chuyền lên các node Worker/Control-plane của RKE2
scp vdp-portal.tar.gz root@10.167.70.13:/var/lib/rancher/rke2/agent/images/
scp vdp-portal.tar.gz root@10.167.70.14:/var/lib/rancher/rke2/agent/images/
scp vdp-portal.tar.gz root@10.167.70.15:/var/lib/rancher/rke2/agent/images/
```
*Lưu ý: RKE2 sẽ tự động nhận diện và nạp image từ thư mục `/var/lib/rancher/rke2/agent/images/` vào containerd sau khoảng 1-2 phút.*

---

## 3. Cấu Hình Bảng Giá Trị Helm (Helm Values Matrix)

Bảng dưới đây liệt kê toàn bộ các biến môi trường cần truyền vào Helm Chart (`helm/values.yaml` hoặc K8s Secret):

| Tên Biến Môi Trường | Mô Tả Chức Năng | Ví Dụ Giá Trị | Nhạy Cảm (Sensitive)? |
|---|---|---|:---:|
| `AUTH_SECRET` | Khóa mã hóa session cookie cho Auth.js | `a8f9b2c...<32 chars>` | 🔴 Có |
| `NEXTAUTH_URL` | URL gốc của portal | `https://portal.lakehouse.local` | ⚪ Không |
| `KEYCLOAK_ISSUER` | OIDC Issuer endpoint | `https://keycloak.lakehouse.local/realms/lakehouse` | ⚪ Không |
| `KEYCLOAK_INTERNAL_URL` | ClusterIP của Keycloak cho BFF | `http://keycloak.keycloak.svc.cluster.local:8080` | ⚪ Không |
| `KEYCLOAK_REALM` | Tên Realm | `lakehouse` | ⚪ Không |
| `KEYCLOAK_CLIENT_ID` | Client ID xác thực | `vdp-portal` | ⚪ Không |
| `KEYCLOAK_CLIENT_SECRET` | Secret key của Keycloak Client | `**********` | 🔴 Có |
| `INTERNAL_AIRFLOW_API` | Airflow ClusterIP API URL | `http://airflow-webserver.airflow.svc.cluster.local:8080/api/v1` | ⚪ Không |
| `INTERNAL_TRINO_URL` | Trino ClusterIP URL | `http://trino.trino.svc.cluster.local:8080` | ⚪ Không |
| `INTERNAL_NESSIE_API` | Nessie ClusterIP URL | `http://nessie.nessie.svc.cluster.local:19120/api/v2` | ⚪ Không |
| `INTERNAL_MINIO_ENDPOINT`| MinIO S3 API URL | `http://minio.minio.svc.cluster.local:9000` | ⚪ Không |
| `INTERNAL_MINIO_ACCESS_KEY`| Tài khoản quản trị MinIO | `minioadmin` | 🔴 Có |
| `INTERNAL_MINIO_SECRET_KEY`| Mật khẩu quản trị MinIO | `**********` | 🔴 Có |
| `INTERNAL_OPENMETADATA` | OpenMetadata API URL | `http://openmetadata.openmetadata.svc.cluster.local:8585/api/v1`| ⚪ Không |
| `INTERNAL_JUPYTERHUB` | JupyterHub API URL | `http://hub.jupyter.svc.cluster.local:8081/hub/api` | ⚪ Không |
| `INTERNAL_GRAFANA` | Grafana ClusterIP URL | `http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80`| ⚪ Không |
| `GRAFANA_ADMIN_PASSWORD` | Mật khẩu Admin Grafana | `**********` | 🔴 Có |
| `PUBLIC_AIRFLOW_URL` | Public domain Airflow (cho iframe)| `https://airflow.lakehouse.local` | ⚪ Không |
| `PUBLIC_GRAFANA_URL` | Public domain Grafana (cho iframe)| `https://grafana.lakehouse.local` | ⚪ Không |
| `PUBLIC_OPENMETADATA_URL`| Public domain OpenMetadata | `https://openmetadata.lakehouse.local` | ⚪ Không |
| `PUBLIC_JUPYTERHUB_URL` | Public domain JupyterHub | `https://jupyterhub.lakehouse.local` | ⚪ Không |
| `NEXT_PUBLIC_OPENMETADATA_URL`| Domain exposed ra browser | `https://openmetadata.lakehouse.local` | ⚪ Không |
| `NEXT_PUBLIC_APP_NAME` | Tên ứng dụng hiển thị trên UI | `VDP Portal` | ⚪ Không |

---

## 4. Triển Khai Bằng Helm (Manual Deployment)

Thực hiện lệnh sau từ máy Bastion hoặc máy trạm có kết nối `kubeconfig` tới cụm RKE2:

```bash
cd lakehouse_portal/vdp-portal

helm upgrade --install vdp-portal ./helm \
  --namespace vdp-portal \
  --create-namespace \
  --values helm/values.yaml \
  --set image.repository=vdp-portal \
  --set image.tag=latest \
  --set env.KEYCLOAK_CLIENT_SECRET="<secret-key>" \
  --set env.INTERNAL_MINIO_SECRET_KEY="<minio-secret>" \
  --set env.GRAFANA_ADMIN_PASSWORD="<grafana-password>"
```

---

## 5. Triển Khai Tự Động Qua ArgoCD (GitOps Application)

Tạo file Manifest `argocd-application.yaml` và nộp vào cụm quản trị:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vdp-portal
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: 'https://github.com/vnpt/lakehouse_portal.git'
    targetRevision: HEAD
    path: vdp-portal/helm
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: vdp-portal
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Thực thi áp dụng:
```bash
kubectl apply -f argocd-application.yaml
```

---

## 6. Kiểm Tra & Xác Nhận Triển Khai (Verification)

Sau khi deploy, kiểm tra trạng thái Pods và Ingress:

```bash
# 1. Kiểm tra trạng thái Pods
kubectl get pods -n vdp-portal

# 2. Xem logs của ứng dụng để đảm bảo không lỗi khởi tạo
kubectl logs -n vdp-portal -l app.kubernetes.io/name=vdp-portal --tail=50 -f

# 3. Kiểm tra Ingress và SSL/TLS Certificate
kubectl get ingress -n vdp-portal

# 4. Kiểm tra sức khỏe API nội bộ qua curl
curl -k https://portal.lakehouse.local/api/health
# Kết quả mong đợi: {"success":true,"status":"ok"}
```

---

## 7. Khôi Phục Phiên Bản Cũ (Rollback)

Nếu phát hiện lỗi nghiêm trọng sau deploy, thực hiện khôi phục về phiên bản release trước đó:

```bash
# Xem lịch sử các lần deploy
helm history vdp-portal -n vdp-portal

# Rollback về revision trước đó (ví dụ revision 1)
helm rollback vdp-portal 1 -n vdp-portal
```
