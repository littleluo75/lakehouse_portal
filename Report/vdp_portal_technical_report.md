# BÁO CÁO KỸ THUẬT CHI TIẾT HỆ THỐNG VNPT DATA PLATFORM (VDP) & THIẾT KẾ TÍCH HỢP VDP PORTAL

**Ngày lập báo cáo:** 2026-06-25  
**Mục tiêu:** Khảo sát toàn diện kho lưu trữ cấu trúc hạ tầng GitOps (`lakehouse_infra`) trên cụm Kubernetes RKE2 HA để phục vụ thiết kế và phát triển Cổng thông tin hợp nhất **VDP Portal**.

---

## MỤC LỤC
1. [Inventory Danh Sách Các Services Đang Chạy](#1-inventory-danh-sách-các-services-đang-chạy)
2. [Phân Tích Kiến Trúc Networking & Ingress](#2-phân-tích-kiến-trúc-networking--ingress)
3. [Phương Thức Authentication & SSO (Keycloak)](#3-phương-thức-authentication--sso-keycloak)
4. [Bảng Ma Trận Tổng hợp API & Cơ Chế Tích Hợp Cho Portal](#4-bảng-ma-trận-tổng-hợp-api--cơ-chế-tích-hợp-cho-portal)
5. [Customizations & Configuration Hotspots](#5-customizations--configuration-hotspots)
6. [Gaps & Technical Debt Cản Trở Tích Hợp Portal](#6-gaps--technical-debt-cản-trở-tích-hợp-portal)
7. [Khuyến Nghị Kiến Trúc & Roadmap Cho VDP Portal](#7-khuyến-nghị-kiến-trúc--roadmap-cho-vdp-portal)

---

## 1. INVENTORY DANH SÁCH CÁC SERVICES ĐANG CHẠY

Hệ thống VNPT Data Platform được triển khai trên cụm **Bare-metal RKE2 HA** (`v1.35.5+rke2r2`) gồm 3 Control-plane/Worker nodes (`10.167.70.13`, `10.167.70.14`, `10.167.70.15`) và 1 Bastion Host (`10.167.70.16`). Quản trị trạng thái hoàn toàn tự động theo mô hình **GitOps** thông qua **ArgoCD**.

Dưới đây là bảng tổng hợp thông số kỹ thuật chi tiết của toàn bộ dịch vụ trong nền tảng:

| Tên Service | Phiên Bản | Namespace | Internal Endpoint (ClusterIP / DNS) | External Endpoint (Ingress / NodePort) | Phương Thức Authentication | Cấu Hình / Biến Môi Trường Quan Trọng |
|---|---|---|---|---|---|---|
| **Apache Airflow** | `3.0.0.dev0` (Chart `1.16.0`) | `airflow` | `http://airflow-webserver.airflow.svc:8080` | `https://airflow.lakehouse.local` | **Keycloak SSO** (OIDC via FAB)<br>*Fallback:* Basic Auth (`admin`/`admin`) | `AIRFLOW__WEBSERVER__BASE_URL`<br>`AUTH_ROLES_MAPPING` (`Admin`, `Op`, `User`, `Viewer`) |
| **JupyterHub** | `5.4.6` (Chart `v4.3.5`) | `jupyter` | `http://hub.jupyter.svc:8081` (Hub)<br>`http://proxy-public.jupyter.svc:80` | `https://jupyterhub.lakehouse.local` | **Keycloak SSO** (Generic OIDC)<br>*Roles:* `SuperAdmin`, `Admin`, `DE`, `DS`, `DA` | `OAUTH_CALLBACK_URL`<br>Dynamic Profile Sizing theo Role Keycloak |
| **Keycloak SSO** | `26.6.2` (Chart `24.4.6`) | `keycloak` | `http://keycloak.keycloak.svc:8080` | `https://keycloak.lakehouse.local` | **Local Admin** (`user`/`bitnami123`)<br>**LDAP Federation** (`10.167.70.52:389`) | Realm: `lakehouse`<br>`KC_PROXY_HEADERS=xforwarded` |
| **Trino HA (OLAP)** | Engine `480` (Chart `1.42.2`) | `trino` | `http://trino.trino.svc:8080` | `https://trino.lakehouse.local` | **NONE** (Unauthenticated)<br>Bất kỳ user nào (e.g. `admin`) | Iceberg REST Catalog trỏ tới Nessie<br>MinIO S3 native connector |
| **Project Nessie** | `0.108.0` | `nessie` | `http://nessie.nessie.svc:19120` | `https://nessie.lakehouse.local` | **NONE** (`security=NONE`) | API v1 (`/api/v1`) & v2 (`/api/v2`)<br>Storage: PostgreSQL 16 trên Longhorn |
| **MinIO Storage** | `2024-12-18` (Chart `5.4.0`) | `minio` | `http://minio.minio.svc:9000` (S3 API)<br>`http://minio.minio.svc:9001` (Console) | `https://minio.lakehouse.local` (Console) | **AWS S3 Key** (`minioadmin`/`123123123`) | `s3a.path.style.access=true`<br>Buckets: `iceberg-warehouse`, `spark-events` |
| **StarRocks (OLAP)** | `v4.1` (Chart `1.11.5`) | `starrocks` | `starrocks-fe-service.starrocks.svc:9030` (SQL)<br>`http://...:8030` (HTTP) | Web: `https://starrocks.lakehouse.local`<br>SQL: `10.167.70.13:30030` (NodePort) | **MySQL Native** (`root` / rỗng) | External Catalog Iceberg kết nối Nessie<br>3 FE HA Quorum + 3 BE + CN HPA |
| **Spark Operator** | `v2.4.0` (Spark `3.5.0`) | `spark-operator` | Spark Connect: `gRPC port 15002`<br>Connect NodePort: `30052` | Connect: `sc://10.167.70.13:30052`<br>UI: `https://<job>.spark-ui.lakehouse.local` | **K8s RBAC** / Unauthenticated gRPC | Batch Scheduler: `volcano`<br>Event logs: `s3a://spark-events/` |
| **Volcano Scheduler** | `v1.15.0` | `volcano-system` | Dashboard UI: `http://...:80`<br>Grafana: `http://...:30004` | Dashboard: `https://volcano.lakehouse.local`<br>Grafana: `https://grafana-volcano...` | UI: **NONE**<br>Grafana: Basic Auth (`admin`/`admin`) | Gang Scheduling cho Spark/AI<br>Queues: `default`, `dev` (1 CPU/1Gi RAM) |
| **Monitoring (PLG)** | Prom Stack `87.0.0`<br>Loki `7.0`<br>Promtail `6.17` | `monitoring` | Prometheus: `http://...:9090`<br>Grafana: `http://...:80`<br>Loki: `http://...:3100` | Grafana: `https://grafana.lakehouse.local` | Grafana: **Basic Auth** (`admin`/`GrafanaAdminPass123!`) | Dashboard: *Lakehouse Observability Portal*<br>Loki S3 Backend lưu trên MinIO |
| **OpenMetadata** | `1.12.11` | `openmetadata` | Server API: `http://openmetadata...:8585` | `https://openmetadata.lakehouse.local` | **Basic Auth** (`admin`/`admin`)<br>*Sẵn sàng bật:* Keycloak OIDC | K8s-native Ingestion Jobs (tiết kiệm ~6GB RAM)<br>DB: Postgres + OpenSearch |
| **Rancher & Longhorn**| Rancher `2.14.2`<br>Longhorn `1.12`| `cattle-system`<br>`longhorn-system`| Internal K8s Services | `https://rancher.lakehouse.local`<br>`https://longhorn.lakehouse.local` | Rancher Local / Longhorn Internal | Quản trị K8s & Storage đĩa phân tán Longhorn RWX |

---

## 2. PHÂN TÍCH KIẾN TRÚC NETWORKING & INGRESS

### 2.1. Luồng định tuyến traffic từ bên ngoài (Outside-in Traffic Flow)
Hệ thống sử dụng kiến trúc bảo mật 2 lớp Reverse Proxy đứng trước Cluster:
```text
[ Người Dùng / Trình Duyệt ]
             │ (HTTPS : 443 / TCP : 30030, 30052)
             ▼
┌────────────────────────────────────────────────────────┐
│ BASTION HOST ENTRYPOINT (IP: 10.167.70.16)             │
│ Lớp 1: HAProxy chạy trực tiếp trên Host OS             │
└────────────────┬───────────────────────────────────────┘
                 │ (TCP Passthrough / Forwarding)
                 ▼
┌────────────────────────────────────────────────────────┐
│ TRAEFIK INGRESS CONTROLLER (DaemonSet trên 3 Nodes)    │
│ Lớp 2: Sử dụng hostNetwork: true cắm thẳng vào Port 80/443│
└────────────────┬───────────────────────────────────────┘
                 │ (HTTP/HTTPS Routing theo Host Header)
                 ▼
┌────────────────────────────────────────────────────────┐
│ KUBERNETES CLUSTERIP SERVICES & PODS                   │
│ (Airflow, Trino, Nessie, Keycloak, JupyterHub, v.v.)   │
└────────────────────────────────────────────────────────┘
```
- **Lưu ý đặc biệt về NodePort (Giao thức phi HTTP):** Với cổng truy vấn MySQL của StarRocks (`30030`) và cổng gRPC của Spark Connect (`30052`), traffic không đi qua Traefik Ingress Controller mà được HAProxy trên Bastion forward thẳng sang cổng NodePort tương ứng trên các Worker Nodes (`10.167.70.13`, `10.167.70.14`, `10.167.70.15`).

### 2.2. Cơ chế TLS/SSL Termination & Quản lý Chứng chỉ
- Toàn bộ chứng chỉ HTTPS được quản lý tập trung và tự động gia hạn bởi **`cert-manager`**.
- Cluster khai báo một tổ chức cấp phát chứng chỉ nội bộ (`ClusterIssuer`) mang tên **`lakehouse-ca`** (sử dụng cặp khóa gốc trong Secret `lakehouse-ca-secret` tại namespace `cert-manager`).
- Các tài nguyên Ingress của từng dịch vụ đều gắn Annotation:
  ```yaml
  cert-manager.io/cluster-issuer: lakehouse-ca
  ```
  Khi apply Ingress, `cert-manager` tự động phát sinh một Kubernetes TLS Secret chứa `tls.crt` và `tls.key` hợp lệ cho tên miền đó. Máy client truy cập cần import file `lakehouse-ca.crt` vào Trusted Root CAs của hệ điều hành.

### 2.3. Quy tắc Đặt tên Tên miền (Domain Naming Convention)
Tất cả các dịch vụ nền tảng tuân thủ nghiêm ngặt quy tắc Wildcard Domain: **`*.lakehouse.local`** phân giải về IP Bastion `10.167.70.16`.
- *Core Apps:* `airflow.lakehouse.local`, `jupyterhub.lakehouse.local`, `keycloak.lakehouse.local`
- *Data Engines:* `trino.lakehouse.local`, `starrocks.lakehouse.local`, `nessie.lakehouse.local`, `minio.lakehouse.local`
- *Governance & Ops:* `openmetadata.lakehouse.local`, `grafana.lakehouse.local`, `volcano.lakehouse.local`, `rancher.lakehouse.local`, `longhorn.lakehouse.local`
- *Dynamic UI (Spark Operator sinh tự động):* `<appName>-<namespace>.spark-ui.lakehouse.local`

### 2.4. Phân tích Các Ràng buộc Mạng (Network Constraints)
1. **Môi trường Air-gapped (Offline hoàn toàn):** Cluster RKE2 bị cô lập không có kết nối Internet. Mọi thao tác deploy mới không thể pull Docker Image trực tiếp mà phải nạp trước qua tệp `.tar` vào thư mục `/var/lib/rancher/rke2/agent/images/`.
2. **Chính sách CORS (Cross-Origin Resource Sharing):** Hiện tại **chưa có cấu hình CORS tập trung** trên Traefik hay trên các API backend (ngoại trừ Keycloak khai báo `webOrigins`). Nếu VDP Portal chạy dưới dạng Client-side SPA (React/Vue/Angular) gọi trực tiếp REST API của Trino hoặc Nessie từ trình duyệt, request sẽ bị chặn hoàn toàn bởi lỗi CORS.

---

## 3. PHƯƠNG THỨC AUTHENTICATION & SSO (KEYCLOAK)

### 3.1. Hiện trạng cấu hình Realm `lakehouse`
Toàn bộ thông tin định danh được khởi tạo tự động từ ConfigMap `keycloak-realm-import` (`manifests/realm-import.yaml`):
- **Realm ID:** `lakehouse`
- **LDAP Federation:** Đã tích hợp OpenLDAP nội bộ (`10.167.70.52:389`, Bind DN `cn=admin,dc=vnpt,dc=vn`, sync tự động users vào danh sách).
- **Hệ thống Roles chuẩn hóa:**
  - *Quản trị:* `SuperAdmin` (Composite kế thừa quyền của Admin + Op + User + Viewer), `Admin`, `Op`, `User`, `Viewer`, `PM`.
  - *Chuyên môn Dữ liệu:* `DE` (Data Engineer), `DS` (Data Scientist), `DA` (Data Analyst), `BA` (Business Analyst).

### 3.2. Cơ chế Mapping Identity của Các Services đã tích hợp SSO

```text
┌────────────────────────────────────────────────────────────────────────┐
│ KEYCLOAK SSO REALM : "lakehouse" (OIDC Provider)                       │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ Client: "airflow"               │ Client: "jupyterhub"
                   ▼                                 ▼
     ┌───────────────────────────┐     ┌─────────────────────────────────┐
     │ APACHE AIRFLOW            │     │ JUPYTERHUB                      │
     │ (FAB Security Manager)    │     │ (GenericOAuthenticator)         │
     ├───────────────────────────┤     ├─────────────────────────────────┤
     │ Keycloak Role ──► FAB Role│     │ Keycloak Role ──► Kube Profile  │
     │ • Admin       ──► Admin   │     │ • DE/DS/Admin ──► Medium (2G RAM│
     │ • Op          ──► Op      │     │ • DS/Admin    ──► Large (4G RAM)│
     │ • User        ──► User    │     │ • Viewer/BA   ──► HTTP 403 Block│
     └───────────────────────────┘     └─────────────────────────────────┘
```

1. **Apache Airflow:** 
   - Sử dụng `client_id: airflow`, secret `airflow-oidc-client-secret-123456`.
   - Cơ chế: Bộ bảo mật `FAB` (Flask-AppBuilder) đọc claim `access_token` từ Keycloak, ánh xạ 1-1 các roles `Admin`, `Op`, `User`, `Viewer` sang quyền truy cập các DAGs tương ứng.
2. **JupyterHub:**
   - Sử dụng `client_id: jupyterhub`, secret `jupyterhub-oidc-client-secret-123456`.
   - Cơ chế Dynamic Profile Sizing: Script Python trong Helm values chặn đăng nhập nếu user không có các role `SuperAdmin`, `Admin`, `DE`, `DS`, `DA`. Đồng thời tùy theo role của user, KubeSpawner sẽ hiển thị các lựa chọn cấu hình Notebook Pod tương ứng (*Standard 1GB RAM*, *Medium 2GB RAM*, *Large 4GB RAM*).

### 3.3. Nhóm Services chưa tích hợp SSO & Phân tích Rủi ro

| Dịch vụ | Phương thức hiện tại | Rủi ro bảo mật nếu tích hợp Portal | Giải pháp chuẩn hóa tích hợp Portal |
|---|---|---|---|
| **Trino HA** | `security=NONE` | Bất kỳ ai gọi REST API đều có thể thực thi câu lệnh SQL với quyền cao nhất | Đặt đằng sau **Traefik ForwardAuth Middleware** hoặc cấu hình Trino JWT/OAuth2 native |
| **Project Nessie** | `security=NONE` | Mất kiểm soát quản trị commit/branch của Iceberg Catalog | Bảo vệ bằng **API Gateway ForwardAuth** kiểm tra Bearer Token |
| **OpenMetadata** | Basic Auth (`admin`/`admin`) | Lộ mật khẩu mặc định, khó quản trị người dùng lớn | **Chuyển cấu hình** `authentication.provider: keycloak` (đã có sẵn hướng dẫn trong docs) |
| **Grafana (PLG)**| Basic Auth (`admin`/...) | Phải duy trì riêng database user trên Grafana | Kích hoạt `auth.generic_oauth` kết nối Keycloak OIDC |
| **Volcano UI** | Unauthenticated | Ai cũng có thể xóa hoặc sửa quota hàng đợi tính toán | Gắn Traefik ForwardAuth middleware bảo vệ route |

---

## 4. BẢNG MA TRẬN TỔNG HỢP API & CƠ CHẾ TÍCH HỢP CHO PORTAL

Để xây dựng **VDP Portal** đóng vai trò là "Single Pane of Glass" (Giao diện duy nhất), dưới đây là bảng phân tích phương thức tích hợp khả thi cho từng thành phần:

| Tên Service | VDP Portal Mong Muốn Hiển Thị Gì? | Phương Thức Tích Hợp Khả Thi | Vị Trí Tài Liệu API / OpenAPI / Swagger Spec | Trạng Thái Sẵn Sàng Tích Hợp |
|---|---|---|---|---|
| **Apache Airflow** | • Danh sách DAGs & Trạng thái chạy<br>• Nút Trigger DAG trực tiếp<br>• Biểu đồ thống kê tác vụ lỗi | **1. REST API v1:** Gọi trực tiếp từ Portal Backend (`/api/v1/dags`)<br>**2. Nhúng Iframe:** Trang chi tiết Graph/Gantt của DAG | Đính kèm sẵn trên Airflow Webserver:<br>`https://airflow.../api/v1/ui` | 🟢 **Ready**<br>(Đã có SSO OIDC & REST API) |
| **JupyterHub** | • Nút "Launch Workspace" khởi tạo Notebook<br>• Trạng thái Server Pod đang chạy của user | **1. REST API:** Gọi `/hub/api/users/{user}/server` để kiểm tra/xóa Pod<br>**2. Redirect SSO:** Mở tab mới nhảy thẳng vào JupyterLab | Tài liệu chuẩn JupyterHub API:<br>`https://jupyterhub.../hub/api` | 🟢 **Ready**<br>(Token sinh tự động qua Keycloak) |
| **Keycloak SSO** | • Quản lý thông tin tài khoản (Profile)<br>• Cấp phát Role cho thành viên dự án | **REST API (Keycloak Admin REST API):**<br>Gọi qua Service Account chuyên dụng của Portal | `https://keycloak.../auth/realms/master/app/api` | 🟢 **Ready** |
| **Trino HA** | • Thanh gõ câu lệnh SQL truy vấn nhanh<br>• Lịch sử các câu query vừa thực thi | **1. REST API:** Gửi query vào `/v1/statement`<br>**2. Trino JS/Node SDK:** Trình điều khiển kết nối DB | Tài liệu Trino REST API chuẩn:<br>`https://trino.io/docs/current/develop/client-protocol.html` | 🟡 **Needs Auth Config**<br>(Hiện đang để auth NONE) |
| **Project Nessie** | • Cây nhánh (Branches/Tags) của Lakehouse<br>• Trạng thái Versioning commit Iceberg | **REST API v2:** Gọi `/api/v2/trees`<br>Hiển thị danh sách branch trực tiếp trên UI Portal | Trực tiếp trên Nessie Server:<br>`https://nessie.../q/openapi` (Swagger UI) | 🟡 **Needs Auth Config**<br>(Cần bọc màng bảo vệ Auth) |
| **MinIO Storage** | • Thống kê dung lượng kho dữ liệu Lakehouse<br>• Trình duyệt tệp tin S3 cơ bản | **MinIO S3 SDK (AWS S3 SDK):**<br>Gọi qua API port `9000` với Access Key | Endpoint S3 chuẩn tương thức AWS | 🟢 **Ready**<br>(Tích hợp qua Backend SDK) |
| **StarRocks** | • Thống kê hiệu năng OLAP Cluster<br>• Bảng danh sách các External Catalogs | **MySQL Protocol:** Gọi qua cổng NodePort `30030` bằng thư viện kết nối SQL | Tài liệu StarRocks Information Schema | 🟢 **Ready** |
| **OpenMetadata** | • Tìm kiếm toàn văn thực thể dữ liệu (Data Lineage)<br>• Bảng từ điển thuật ngữ (Glossary) | **1. Nhúng Iframe:** Nhúng sơ đồ Lineage trực tiếp<br>**2. REST API / SDK:** Gọi tìm kiếm `/api/v1/search/query` | Trực tiếp trên Portal Console:<br>`https://openmetadata.../swagger` | 🟡 **Needs Auth Config**<br>(Cần kích hoạt OIDC trong values) |
| **Volcano Scheduler**| • Danh sách hàng đợi tính toán (`dev`, `default`)<br>• Tài nguyên CPU/Memory đang tiêu thụ | **Kubernetes API / Custom Resource:**<br>Đọc trực tiếp CRD `queues.scheduling.volcano.sh` | Kubernetes OpenAPI Spec | 🟢 **Ready**<br>(Thông qua K8s Client SDK) |
| **Monitoring (Grafana)**| • Biểu đồ thống kê sức khỏe toàn cụm Lakehouse<br>• Bảng log tổng hợp các tác vụ lỗi | **Nhúng Iframe Panels:** Nhúng các Grafana Panels bằng tham số `?kiosk` | Grafana HTTP API Documentation | 🟡 **Needs Config**<br>(Cần bật `allow_embedding=true`) |
| **Spark Operator** | • Danh sách các SparkApplications đang chạy<br>• Link truy cập nhanh Spark UI | **Kubernetes API:** Truy vấn CRD `sparkapplications.sparkoperator.k8s.io` | Kubeflow Spark Operator Docs | 🟢 **Ready** |

---

## 5. CUSTOMIZATIONS & CONFIGURATION HOTSPOTS

Mọi nhà phát triển (Portal Developer) khi bắt tay vào xây dựng Backend/Frontend cho VDP Portal nắm rõ các "Điểm nóng cấu hình" sau để tránh hardcode sai lệch:

### 5.1. File cấu hình GitOps mấu chốt
1. **`rke2/keycloak/manifests/realm-import.yaml`:** Nơi định nghĩa duy nhất về Danh sách Client SSO và Roles toàn hệ thống. Bất kỳ Client mới nào của Portal đều phải thêm vào đây và push lên Git để ArgoCD đồng bộ.
2. **`rke2/terraform_traefik/main.tf`:** Chứa cấu hình cốt lõi của Traefik Ingress Controller chạy chế độ `hostNetwork: true`.

### 5.2. Danh sách Thông số Cấu hình & Biến Môi trường Nền tảng
Khi viết code Backend cho VDP Portal, cần sử dụng các tham số chuẩn sau:

```ini
# --- BẢNG THÔNG SỐ KẾT NỐI NỘI BỘ (CLUSTERIP) CHO PORTAL BACKEND ---
INTERNAL_KEYCLOAK_URL=http://keycloak.keycloak.svc.cluster.local:8080
INTERNAL_AIRFLOW_API=http://airflow-webserver.airflow.svc.cluster.local:8080/api/v1
INTERNAL_TRINO_URL=http://trino.trino.svc.cluster.local:8080
INTERNAL_NESSIE_API=http://nessie.nessie.svc.cluster.local:19120/api/v2
INTERNAL_MINIO_S3=http://minio.minio.svc.cluster.local:9000
INTERNAL_OPENMETADATA=http://openmetadata.openmetadata.svc.cluster.local:8585/api/v1

# --- THÔNG SỐ BẢO MẬT KEYCLOAK OIDC ---
KEYCLOAK_REALM=lakehouse
KEYCLOAK_ISSUER=https://keycloak.lakehouse.local/realms/lakehouse
AIRFLOW_CLIENT_ID=airflow
AIRFLOW_CLIENT_SECRET=airflow-oidc-client-secret-123456
JUPYTERHUB_CLIENT_ID=jupyterhub
JUPYTERHUB_CLIENT_SECRET=jupyterhub-oidc-client-secret-123456

# --- CREDENTIALS QUAN TRỌNG KHI KẾT NỐI STORAGE/DB ---
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=123123123
NESSIE_POSTGRES_USER=nessie
NESSIE_POSTGRES_PASSWORD=123123123
STARROCKS_NODE_PORT_HOST=10.167.70.13:30030
```

---

## 6. GAPS & TECHNICAL DEBT CẢN TRỞ TÍCH HỢP PORTAL

Việc rà soát sâu kiến trúc để lộ ra **4 điểm nghẽn kỹ thuật nghiêm trọng (Blockers & Technical Debt)** cần xử lý ngay trước khi viết những dòng code đầu tiên của Portal:

### 6.1. Thiếu cấu hình CORS (Cross-Origin Resource Sharing) toàn cục
- **Vấn đề:** Trình duyệt áp dụng cơ chế Same-Origin Policy. Khi người dùng dùng VDP Portal tại `https://portal.lakehouse.local` gửi AJAX request tới `https://trino.lakehouse.local` hoặc `https://openmetadata.lakehouse.local`, trình duyệt sẽ chặn đứng request và báo lỗi CORS do các API này chưa trả về header `Access-Control-Allow-Origin: https://portal.lakehouse.local`.
- **Hệ quả:** Portal Frontend hoàn toàn vô hiệu hóa nếu thiết kế theo hướng Client-side SPA gọi API phân tán.

### 6.2. Phân mảnh Cơ chế Phân quyền (Security Fragmentation)
- **Vấn đề:** Kiến trúc hiện tại tồn tại 3 chuẩn xác thực song song:
  1. *OAuth2/OIDC chuẩn:* Airflow, JupyterHub.
  2. *Basic Auth thô sơ:* OpenMetadata, Grafana, Loki.
  3. *Mở hoàn toàn (No Security):* Trino, Nessie, Volcano UI.
- **Hệ quả:** Portal không thể dùng một Bearer Token duy nhất của người dùng để tương tác với tất cả các dịch vụ. Nếu Portal gọi Trino hay Nessie, hệ thống bên dưới không biết ai đang thực thi lệnh.

### 6.3. Rào cản Bảo mật Frame-Ancestors khi Nhúng Iframe
- **Vấn đề:** Khi muốn hiển thị biểu đồ Grafana hoặc sơ đồ Lineage của OpenMetadata ngay trong lòng giao diện VDP Portal thông qua thẻ `<iframe src="...">`, các trình duyệt hiện đại sẽ kiểm tra HTTP Header `X-Frame-Options` hoặc `Content-Security-Policy: frame-ancestors`. Mặc định các ứng dụng này cấu hình `SAMEORIGIN` hoặc `DENY`.
- **Hệ quả:** Iframe hiển thị màn hình trắng kèm lỗi `Refused to display 'https://...' in a frame because it set 'X-Frame-Options' to 'sameorigin'`.

### 6.4. Nút thắt cổ chai kết nối TCP qua Bastion Host
- **Vấn đề:** Các cổng NodePort phi HTTP như StarRocks MySQL (`30030`) và Spark Connect (`30052`) được HAProxy forward trực tiếp từ Bastion Host. Khi Portal có hàng trăm người dùng đồng thời thực hiện kết nối SQL hoặc gửi job Spark tương tác, Bastion Host chịu tải xử lý TCP cực lớn mà không được tận dụng các cơ chế Cache/Load balancing lớp 7 của Traefik Ingress.

---

## 7. KHUYẾN NGHỊ KIẾN TRÚC & ROADMAP CHO VDP PORTAL

Để giải quyết triệt các Gaps trên và xây dựng một kiến trúc cấp doanh nghiệp (Enterprise-grade), tôi đề xuất mô hình tích hợp chuẩn như sau:

### 7.1. Kiến Trúc Đề Xuất: Mô Hình BFF (Backend-for-Frontend) & API Gateway

Khuyến nghị tuyệt đối không để Portal Frontend gọi REST API phân tán tới từng tool. Hãy áp dụng kiến trúc **BFF hợp nhất**:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ TRÌNH DUYỆT NGƯỜI DÙNG (VDP PORTAL SPA - React / Next.js)              │
│ Domain duy nhất: https://portal.lakehouse.local                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ 1. Gọi API: /api/v1/sql, /api/v1/dags
                                    │    (Kèm Cookie / Bearer Token OIDC)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ VDP PORTAL BACKEND (BFF - NestJS / Spring Boot / Go)                   │
│ Đóng vai trò làm Cổng Đăng Ký Tập Trung & Token Relay                  │
├────────────────────────────────────────────────────────────────────────┤
│ • Xử lý phân giải Token Keycloak & Quản lý Session người dùng          │
│ • Kiểm soát RBAC tập trung cho các API không có xác thực               │
│ • Đứng ra làm "Proxy" gọi xuống các Internal ClusterIP bên dưới cluster│
└──────┬───────────────┬───────────────────┬───────────────┬─────────────┘
       │               │                   │               │
       │ (HTTP :8080)  │ (HTTP :19120)     │ (HTTP :8080)  │ (HTTP :8585)
       ▼               ▼                   ▼               ▼
┌──────────────┐┌──────────────┐┌──────────────────┐┌────────────────────┐
│ TRINO HA     ││ NESSIE       ││ APACHE AIRFLOW   ││ OPENMETADATA       │
│ (cluster.local││ (cluster.local││ (cluster.local)  ││ (cluster.local)    │
└──────────────┘└──────────────┘└──────────────────┘└────────────────────┘
```

**Lợi ích vượt trội của mô hình BFF:**
1. **Giải quyết triệt để bài toán CORS:** Trình duyệt chỉ gọi duy nhất tới `https://portal.lakehouse.local/api/*` (Cùng Origin). Toàn bộ liên lạc với Trino, Nessie, Airflow diễn ra ở phía sau giữa Server với Server (trong mạng nội bộ K8s), tốc độ cực nhanh và không bị giới hạn CORS.
2. **Bọc giáp bảo mật cho Trino & Nessie:** Khi người dùng gửi câu lệnh SQL từ Portal tới BFF (`/api/v1/sql`), BFF sẽ kiểm tra Token Keycloak xem user có role `DE` hoặc `DA` hay không. Nếu hợp lệ, BFF mới forward request xuống Trino ClusterIP bên dưới -> Giúp hệ thống Trino dù để `security=NONE` vẫn an toàn tuyệt đối trước người dùng trái phép.
3. **Ẩn giấu cấu trúc hạ tầng:** Người dùng cuối không bao giờ nhìn thấy hoặc biết sự tồn tại của các tên miền hay cổng nội bộ.

---

### 7.2. Roadmap Lộ Trình Chuẩn Bị Infra (4 Giai Đoạn GitOps)

Trước khi đội ngũ lập trình VDP Portal bắt tay vào code, Data Infrastructure Team cần thực hiện 4 bước chuẩn bị sau theo đúng mô hình GitOps hiện tại:

#### Giai Đoạn 1: Chuẩn hóa Identity trên Keycloak (Thời gian dự kiến: 2 ngày)
1. Cập nhật `rke2/keycloak/manifests/realm-import.yaml`, thêm một Client mới dành riêng cho Portal:
   ```json
   {
     "clientId": "vdp-portal",
     "enabled": true,
     "protocol": "openid-connect",
     "publicClient": false,
     "secret": "vdp-portal-secret-key-2026",
     "redirectUris": ["https://portal.lakehouse.local/*"],
     "webOrigins": ["https://portal.lakehouse.local"]
   }
   ```
2. Kích hoạt OIDC cho OpenMetadata trong `rke2/openmetadata/values-production.yaml`:
   ```yaml
   authentication:
     provider: "keycloak"
     publicUrl: "https://keycloak.lakehouse.local"
     authority: "https://keycloak.lakehouse.local/realms/lakehouse"
     clientId: "openmetadata"
     callbackUrl: "https://openmetadata.lakehouse.local/callback"
   ```

#### Giai Đoạn 2: Xử lý Chính sách Nhúng Iframe (Thời gian dự kiến: 1 ngày)
Để Portal nhúng được Airflow và Grafana một cách mượt mà không bị trắng trang:
1. Sửa cấu hình Airflow trong `rke2/airflow/values-production.yaml` (hoặc biến môi trường tương ứng):
   ```ini
   AIRFLOW__WEBSERVER__X_FRAME_ENABLED=True
   ```
2. Sửa cấu hình Grafana trong `rke2/monitoring/values-prometheus-operator.yaml`:
   ```yaml
   grafana:
     grafana.ini:
       security:
         allow_embedding: true
         cookie_secure: true
         cookie_samesite: none
   ```

#### Giai Đoạn 3: Thiết lập Cổng Traefik ForwardAuth cho UI chưa bảo mật (Thời gian: 2 ngày)
Triển khai Middleware Traefik ForwardAuth kết nối với `oauth2-proxy` để bảo vệ các giao diện quản trị thô sơ (Volcano UI, Longhorn UI):
```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: keycloak-forwardauth
  namespace: traefik
spec:
  forwardAuth:
    address: http://oauth2-proxy.keycloak.svc.cluster.local/oauth2/auth
    trustForwardHeader: true
```
Gắn middleware này vào Ingress của Volcano và Longhorn -> Đảm bảo chỉ Admin mới vào được UI quản trị hạ tầng sâu.

#### Giai Đoạn 4: Triển khai Module GitOps cho VDP Portal (Thời gian: 1 ngày)
Khởi tạo cấu trúc module mới trong Git repo `lakehouse_infra` để chuẩn bị đón nhận sản phẩm Portal:
```text
rke2/vdp_portal/
  ├── README.md
  ├── values-production.yaml       # Helm values cho Portal BFF & Frontend
  ├── argocd-application.yaml      # Khai báo ArgoCD App trỏ về repo code Portal
  └── manifests/
      └── portal-ingress.yaml      # Traefik Ingress cho https://portal.lakehouse.local
```

---
**KẾT LUẬN:** Repo `lakehouse_infra` hiện tại sở hữu nền tảng GitOps rất chuẩn mực, các engine Big Data mạnh mẽ và ổn định. Khi áp dụng đúng **Mô hình BFF hợp nhất** kết hợp lộ trình chuẩn hóa 4 bước trên, dự án **VDP Portal** sẽ tích hợp hoàn hảo, bảo mật cấp cao và mang lại trải nghiệm tương tác tuyệt vời cho toàn bộ doanh nghiệp.
