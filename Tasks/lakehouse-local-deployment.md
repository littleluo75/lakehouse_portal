# Kế Hoạch Triển Khai Cục Bộ VDP Portal trên Docker Desktop (Local Deployment Plan)

> **Trạng thái:** Planning Mode (Chưa sửa đổi code source hay thực thi cài đặt hạ tầng)  
> **Ngày lập kế hoạch:** 2026-07-01  
> **Phạm vi:** Đánh giá toàn diện kiến trúc giữa hai kho chứa `lakehouse_infra` (RKE2 Kubernetes Bare-metal) và `lakehouse_portal` (Next.js 16 App Router BFF) để xây dựng lộ trình chuyển đổi chạy hoàn chỉnh trên Docker Desktop.

---

## 1. Executive Summary (Tóm Tắt Điều Hành)

Mục tiêu cốt lõi của kế hoạch này là xác minh khả năng thực thi và xây dựng quy trình triển khai cục bộ (Local Deployment) cho hệ thống **VNPT Data Lighthouse (`lakehouse_portal`)** kết hợp với toàn bộ hệ sinh thái dịch vụ nền tảng **VNPT Data Platform (`lakehouse_infra`)** trên môi trường **Docker Desktop** thay thế hoàn toàn cho cụm Kubernetes RKE2 Bare-metal 3 node.

### Phát Hiện Quan Trọng Từ Quá Trình Kiểm Toán (Key Findings)
1. **Kiến trúc BFF chuẩn mực nhưng phụ thuộc mạng K8s:** `lakehouse_portal` sử dụng Next.js 16 App Router đóng vai trò Backend-For-Frontend (BFF). Toàn bộ giao tiếp từ Portal tới các dịch vụ phía sau (Trino, Airflow, Nessie, MinIO, OpenMetadata, JupyterHub, Grafana) đều sử dụng giao thức HTTP/REST hoặc cơ sở dữ liệu thông qua cơ chế phân giải tên miền nội bộ Kubernetes (`*.svc.cluster.local`). Việc chuyển sang Docker Desktop hoàn toàn khả thi bằng cách ánh xạ sang mạng bridge nội bộ (`docker-compose network`) và giữ nguyên logic proxy.
2. **Điểm nghẽn phụ thuộc K8s API Native (Critical Gap):** Module theo dõi Spark Jobs (`/api/spark/applications`) và cụm giám sát sức khỏe K8s (`/api/admin/cluster/health`) sử dụng trực tiếp SDK `@kubernetes/client-node` (`src/lib/services/k8s.ts`) để truy vấn Custom Resource Definitions (`SparkApplication` trong `sparkoperator.k8s.io/v1beta2` và `Queue` trong `scheduling.volcano.sh/v1beta1`). Khi chạy thuần trên Docker Desktop không có Kubernetes API Server, các module này sẽ gặp lỗi kết nối nếu không được bổ sung cơ chế fallback hoặc chạy mô hình Hybrid K8s.
3. **Sự lệch pha về cổng dịch vụ StarRocks:** Cấu hình biến môi trường Portal mặc định kết nối tới StarRocks qua cổng `9030` (giao thức MySQL Client), trong khi healthcheck của dashboard (`src/app/api/dashboard/summary/route.ts`) kiểm tra qua cổng HTTP `8030`. Cần đảm bảo cấu hình Docker expose đầy đủ cả 2 cổng.
4. **Trạng thái Module Kafka:** Theo ghi chú tại `src/app/(dashboard)/streams/page.tsx`, module Kafka hiện đang ở Kịch bản C (chưa được triển khai trong `lakehouse_infra`). Do đó, trong giai đoạn chạy local có thể bỏ qua dịch vụ Kafka broker mà không làm gián đoạn các luồng nghiệp vụ chính.

### Các Phương Án Triển Khai (Deployment Options Analysis)
Để đảm bảo tính minh bạch và không tự chọn ngầm, chúng tôi xác định **3 phương án triển khai cục bộ** tùy thuộc vào mục đích sử dụng của Data Engineer / Frontend Developer:

| Phương Án | Mô Tả Kiến Trúc | Ưu Điểm | Nhược Điểm | Đề Xuất Áp Dụng |
|---|---|---|---|---|
| **Phương án 1: Pure Docker Compose (Khuyến nghị cho Dev UI/BFF)** | Chuyển đổi toàn bộ dịch vụ lưu trữ, query engine, catalog và metadata (Keycloak, Postgres, MinIO, Nessie, OpenMetadata, Trino, StarRocks, Airflow) sang container trên Docker Compose. Các call K8s CRD (Spark/Volcano) được fallback về mock data. | Nhẹ máy (tiết kiệm ~4-6GB RAM so với chạy K8s local), khởi động nhanh (< 2 phút), dễ debug log qua lệnh `docker compose logs`. | Không chạy được thực tế các luồng Spark Operator hoặc JupyterHub KubeSpawner pod động. | **Khuyến nghị cao nhất** để phát triển và kiểm thử toàn diện giao diện Portal & BFF logic. |
| **Phương án 2: Hybrid Docker Desktop K8s + Compose** | Kích hoạt tính năng Kubernetes tích hợp trong Docker Desktop (hoặc dùng Kind/k3d). Triển khai Spark Operator, Volcano và KubeSpawner trên K8s local, trong khi các data engine nặng (StarRocks, Trino, MinIO) chạy trên Docker Compose bên ngoài. | Giữ nguyên 100% logic native K8s client trong `src/lib/services/k8s.ts`, test được trọn vẹn vòng đời Spark Application. | Yêu cầu tài nguyên phần cứng rất lớn (tối thiểu 32GB RAM CPU 8 nhân), cấu hình mạng routing giữa pod K8s và host bridge phức tạp. | Dành cho Data Engineer cần kiểm thử chuyên sâu luồng điều phối Spark Job CRD. |
| **Phương án 3: Lightweight Dev Stub Profile** | Chỉ dựng các dịch vụ tối thiểu cốt lõi: Keycloak SSO, MinIO Storage, và Trino Coordinator. Các dịch vụ nặng (OpenMetadata, StarRocks, Airflow) được thay thế bằng WireMock hoặc json-server. | Siêu nhẹ (dưới 4GB RAM), chạy mượt trên laptop cấu hình thấp. | Không xác minh được tính tương thích thực tế giữa Portal và các schema API của backend thực tế. | Dành cho Frontend Designer chỉnh sửa giao diện shadcn/ui thô. |

---

## 2. Architecture Comparison (So Sánh Kiến Trúc RKE2 vs Docker Desktop)

### 2.1. Kiến Trúc Tổng Thể (Overall Architecture)
*   **Trên RKE2 Bare-metal (`lakehouse_infra`):** Hệ thống chạy trên 3 node vật lý (`10.167.70.13` - `.15`) với Bastion HAProxy (`10.167.70.16`). Traefik Ingress Controller quản lý định tuyến ngoại vi với chứng chỉ TLS do `cert-manager` cấp phát qua ClusterIssuer `lakehouse-ca`. Dữ liệu block và persistent volume được nhân bản phân tán qua **Longhorn StorageClass**.
*   **Trên Docker Desktop Local:** Hệ thống thu gọn vào 1 máy trạm duy nhất. Traefik Ingress và HAProxy được thay thế bằng việc bind port trực tiếp hoặc một container Nginx/Traefik Reverse Proxy cục bộ. Longhorn StorageClass được thay thế bằng **Docker Named Volumes** (sử dụng local driver).

### 2.2. Service Dependency Graph (Sơ Đồ Phụ Thuộc Dịch Vụ)
```mermaid
graph TD
    classDef portal fill:#d4e157,stroke:#333,stroke-width:2px;
    classDef engine fill:#e1bee7,stroke:#333,stroke-width:1px;
    classDef catalog fill:#ffcc80,stroke:#333,stroke-width:1px;
    classDef db fill:#b2dfdb,stroke:#333,stroke-width:1px;
    classDef auth fill:#f8bbd0,stroke:#333,stroke-width:1px;

    User[Browser Client] -->|HTTPS :3000 / localhost:3000| Portal[Next.js VDP Portal BFF]:::portal
    User -->|SSO OIDC Redirect| Keycloak[Keycloak SSO Server :8080]:::auth

    subgraph Core Security & Identity
        Keycloak -->|JDBC :5432| KeycloakDB[(Postgres Keycloak DB)]:::db
    end

    subgraph BFF API Proxy Targets Layer
        Portal -->|OIDC / UserInfo| Keycloak
        Portal -->|HTTP REST :8080| Airflow[Apache Airflow Webserver]:::engine
        Portal -->|HTTP REST :8080| Trino[Trino Coordinator]:::engine
        Portal -->|HTTP REST :19120| Nessie[Project Nessie Catalog]:::catalog
        Portal -->|HTTP REST :8585| OpenMetadata[OpenMetadata Server]:::catalog
        Portal -->|HTTP REST :8081| Jupyter[JupyterHub Server]:::engine
        Portal -->|HTTP REST :80| Grafana[Grafana Observability]:::engine
        Portal -->|S3 API :9000| MinIO[MinIO Object Storage]:::db
        Portal -->|MySQL :9030 / HTTP :8030| StarRocks[StarRocks FE]:::engine
    end

    subgraph Internal Data & Metadata Flows
        Airflow -->|JDBC :5432| AirflowDB[(Postgres Airflow DB)]:::db
        Nessie -->|JDBC2 :5432| NessieDB[(Postgres Nessie DB)]:::db
        OpenMetadata -->|JDBC :5432| OpenMetadataDB[(Postgres OM DB)]:::db
        OpenMetadata -->|HTTP :9200| OpenSearch[(OpenSearch Engine)]:::db
        Trino -->|Iceberg REST :19120| Nessie
        Trino -->|S3 Parquet :9000| MinIO
        StarRocks -->|External Catalog S3 :9000| MinIO
    end
```

### 2.3. Startup Order (Trật Tự Khởi Động Khuyến Nghị)
Hệ thống phụ thuộc chặt chẽ vào trật tự khởi động theo 5 tầng (Layers) để tránh tình trạng CrashLoopBackOff:
1.  **Layer 0 (Core Infrastructure & Storage):** `keycloak-db`, `nessie-db`, `openmetadata-db`, `airflow-db`, `opensearch`, `minio`.
2.  **Layer 1 (Identity & Initialization):** `minio-init-buckets` (job tạo bucket `iceberg-warehouse`, `spark-events-*`), `keycloak` (import realm `lakehouse`).
3.  **Layer 2 (Data Catalogs & Meta Services):** `nessie` (chờ `nessie-db`), `openmetadata` (chờ `openmetadata-db` & `opensearch`).
4.  **Layer 3 (Compute & Orchestration Engines):** `trino-coordinator`, `starrocks-fe`, `starrocks-be`, `airflow-webserver`, `airflow-scheduler`, `jupyterhub`, `grafana`.
5.  **Layer 4 (Application Portal):** `vdp-portal` (khởi động sau cùng, khi Keycloak và các internal endpoints đã sẵn sàng phục vụ HTTP 200).

---

## 3. Gap Analysis (Kiểm Toán & Phát Hiện Sai Lệch Chi Tiết)

Bảng phân tích dưới đây đối chiếu toàn diện các cấu hình giữa `lakehouse_infra` (nguồn chân lý K8s) và `lakehouse_portal` (thông số mong đợi tại BFF) để xác định các sai lệch cần xử lý khi chạy local trên Docker Desktop:

| Hạng Mục | Cấu Hình Tại `lakehouse_infra` (K8s) | Cấu Hình Mong Đợi Tại `lakehouse_portal` (BFF Env) | Mức Độ Ảnh Hưởng | Xử Lý Đề Xuất Cho Local Docker Desktop | Phân Loại Sửa Đổi |
|---|---|---|:---:|---|:---:|
| **Keycloak Internal URL** | `http://keycloak.keycloak.svc.cluster.local:8080` | `KEYCLOAK_INTERNAL_URL` | 🔴 **Critical** | Đổi thành `http://keycloak:8080` trong container network. Cần ánh xạ tên miền `keycloak.lakehouse.local -> 127.0.0.1` trên file `/etc/hosts` của máy trạm để OIDC Redirect từ browser hoạt động. | Config Only (`.env.local`) |
| **Keycloak SSO Client Secret** | Secret `vdp-portal-oidc-client-secret-123456` trong manifest/values | `KEYCLOAK_CLIENT_SECRET` | 🔴 **Critical** | Đồng bộ giá trị secret từ file import `keycloak_secret.json` hoặc tạo biến môi trường khớp exact string trong `docker-compose.env`. | Config Only |
| **Airflow Internal API** | `http://airflow-webserver.airflow.svc.cluster.local:8080/api/v1` | `INTERNAL_AIRFLOW_API` | 🟠 **High** | Đổi thành `http://airflow:8080/api/v1`. Cấu hình Airflow bỏ qua xác thực OIDC phức tạp khi chạy local dev hoặc seed token qua biến môi trường. | Config Only (`.env.local`) |
| **Trino URL & Port** | `http://trino.trino.svc.cluster.local:8080` | `INTERNAL_TRINO_URL` | 🟠 **High** | Đổi thành `http://trino:8080`. Đảm bảo container Trino có quyền kết nối tới container `nessie:19120` và `minio:9000`. | Config Only (`.env.local`) |
| **Nessie Catalog Endpoint** | `http://nessie.nessie.svc.cluster.local:19120/api/v2` | `INTERNAL_NESSIE_API` | 🟠 **High** | Đổi thành `http://nessie:19120/api/v2`. | Config Only (`.env.local`) |
| **MinIO Endpoint & Keys** | `http://minio.minio.svc.cluster.local:9000` (`minioadmin` / secret) | `INTERNAL_MINIO_ENDPOINT`, `INTERNAL_MINIO_SECRET_KEY` | 🔴 **Critical** | Đổi endpoint thành `http://minio:9000`. Cố định cặp key `minioadmin` / `minioadmin123` trong cấu hình Docker Compose và `.env.local`. | Config Only (`.env.local`) |
| **OpenMetadata URL & Auth** | `http://openmetadata.openmetadata.svc.cluster.local:8585/api/v1` (`admin`/`admin` basic auth) | `INTERNAL_OPENMETADATA`, `INTERNAL_OPENMETADATA_PASSWORD` | 🟡 **Medium** | Đổi thành `http://openmetadata:8585/api/v1`. Khớp mật khẩu basic auth mặc định của image OpenMetadata. | Config Only (`.env.local`) |
| **JupyterHub Endpoint** | `http://hub.jupyter.svc.cluster.local:8081/hub/api` | `INTERNAL_JUPYTERHUB` | 🟡 **Medium** | Đổi thành `http://jupyterhub:8081/hub/api`. Trong môi trường thuần Docker Compose, KubeSpawner không spawn được pod K8s, cần dùng SimpleLocalSpawner hoặc stub API. | Config Only |
| **Grafana URL & Auth** | `http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80` | `INTERNAL_GRAFANA` | 🟡 **Medium** | Đổi thành `http://grafana:3000` (lưu ý: trên K8s service expose port 80 map vào targetPort 3000 của Grafana pod, trên Docker Compose cần dùng cổng gốc 3000 hoặc ánh xạ). | Config Only (`.env.local`) |
| **StarRocks Host & Ports** | `starrocks-fe-service.starrocks.svc.cluster.local` (Port `9030` MySQL query, NodePort `30080` Web/Health) | `STARROCKS_HOST`, `STARROCKS_PORT` (`9030`) | 🟠 **High** | Đổi host thành `starrocks-fe`. Cần lưu ý code healthcheck trong portal gọi port `8030` (`http://${STARROCKS_HOST}:8030/api/health`), trong khi query gọi `9030`. Container Docker cần mở cả 2 port `8030` và `9030`. | Config Only (`.env.local`) |
| **K8s CRD API (Spark Jobs / Volcano)** | Gọi trực tiếp K8s API Server (`https://kubernetes.default.svc`) qua `@kubernetes/client-node` | `src/lib/services/k8s.ts`, `src/app/api/spark/applications/route.ts` | 🔴 **Critical** | Khi chạy Docker Compose không có K8s API Server, SDK `client-node` sẽ ném ngoại lệ khi cố load `defaultConfig`. Portal cần được bổ sung logic try-catch graceful fallback (tương tự như `src/app/api/admin/cluster/health/route.ts` đã làm) để trả về mảng rỗng `[]` thay vì lỗi HTTP 500. | **Code Change (Khuyến nghị)** hoặc Config Fallback |
| **Kafka Broker** | Chưa triển khai trong `lakehouse_infra` | `src/app/(dashboard)/streams/page.tsx` | 🟢 **Low** | Trang UI đã được thiết kế sẵn trạng thái placeholder (Kịch bản C). Bỏ qua cài đặt Kafka khi deploy local. | Không cần xử lý |

---

## 4. Endpoint & Port Mapping Matrix (Ma Trận Cổng & Kết Nối)

Bảng dưới đây quy định chính xác ánh xạ cổng giữa môi trường K8s ClusterIP và môi trường Docker Compose local:

| Dịch Vụ | K8s ClusterIP URL (`lakehouse_infra`) | Docker Compose Container Hostname | Cổng Nội Bộ (Bridge Network) | Cổng Expose Ra Máy Chủ Host (Localhost) | Giao Thức |
|---|---|---|:---:|:---:|---|
| **VDP Portal (BFF)** | `vdp-portal.vdp-portal.svc.cluster.local:3000` | `vdp-portal` | 3000 | `3000` (hoặc 80 qua Traefik) | HTTP / Next.js |
| **Keycloak SSO** | `keycloak.keycloak.svc.cluster.local:8080` | `keycloak` | 8080 | `8080` | HTTP / OIDC |
| **Keycloak DB** | `keycloak-db.keycloak.svc.cluster.local:5432` | `keycloak-db` | 5432 | `54321` (tránh xung đột host) | PostgreSQL |
| **Airflow Webserver** | `airflow-webserver.airflow.svc.cluster.local:8080` | `airflow` | 8080 | `8082` | HTTP / REST API |
| **Airflow DB** | `airflow-postgresql.airflow.svc.cluster.local:5432`| `airflow-db` | 5432 | `54322` | PostgreSQL |
| **Trino Coordinator** | `trino.trino.svc.cluster.local:8080` | `trino` | 8080 | `8083` | HTTP / JDBC |
| **Project Nessie** | `nessie.nessie.svc.cluster.local:19120` | `nessie` | 19120 | `19120` | HTTP / Iceberg REST |
| **Nessie DB** | `nessie-postgresql.nessie.svc.cluster.local:5432` | `nessie-db` | 5432 | `54323` | PostgreSQL |
| **MinIO Storage** | `minio.minio.svc.cluster.local:9000` (S3) / `9001` (UI)| `minio` | 9000 / 9001 | `9000` (S3) / `9001` (UI) | HTTP / S3 API |
| **OpenMetadata API**| `openmetadata.openmetadata.svc.cluster.local:8585` | `openmetadata` | 8585 | `8585` | HTTP / REST API |
| **OpenMetadata DB** | `openmetadata-db.openmetadata.svc.cluster.local:5432`| `openmetadata-db` | 5432 | `54324` | PostgreSQL |
| **OpenSearch Engine**| `opensearch.openmetadata.svc.cluster.local:9200` | `opensearch` | 9200 | `9200` | HTTP / Elastic REST |
| **JupyterHub** | `hub.jupyter.svc.cluster.local:8081` | `jupyterhub` | 8081 | `8081` | HTTP / REST API |
| **Grafana Server** | `kube-prometheus-stack-grafana.monitoring...:80` | `grafana` | 3000 | `3001` | HTTP / REST API |
| **StarRocks FE** | `starrocks-fe-service.starrocks...:9030` / `8030` | `starrocks-fe` | 9030 / 8030 | `9030` (SQL) / `8030` (Web) | MySQL Protocol / HTTP |

---

## 5. Infrastructure Tool Inventory (Thống Kê Công Cụ Hạ Tầng)

Thống kê chi tiết toàn bộ các dịch vụ và công cụ được triển khai trong kho `lakehouse_infra`, cấu hình tối thiểu để thực thi functional trên môi trường local:

| Tên Công Cụ / Dịch Vụ | Version Chart / App | Docker Image Chính Thức | Volumes / Mounts Tối Thiểu | Biến Môi Trường Cốt Lõi (Environment Variables) | Phụ Thuộc (Dependencies) | Healthcheck Command / URL |
|---|---|---|---|---|---|---|
| **Keycloak SSO** | Chart v7.2.0 (v26.6.2) | `quay.io/keycloak/keycloak:26.6.2` | `./rke2/keycloak/manifests/realm-import.json:/opt/keycloak/data/import/realm.json:ro` | `KC_DB=postgres`, `KC_DB_URL=jdbc:postgresql://keycloak-db:5432/keycloak`, `KEYCLOAK_ADMIN=admin`, `KEYCLOAK_ADMIN_PASSWORD=admin` | `keycloak-db` | `curl -f http://localhost:8080/health/ready` |
| **PostgreSQL (Keycloak)**| Standalone v16 | `postgres:16-alpine` | `keycloak-db-data:/var/lib/postgresql/data` | `POSTGRES_DB=keycloak`, `POSTGRES_USER=keycloak`, `POSTGRES_PASSWORD=keycloak` | Không có | `pg_isready -U keycloak` |
| **MinIO Object Store** | Chart v5.4.0 (2024-12-18) | `quay.io/minio/minio:RELEASE.2024-12-18T13-15-44Z` | `minio-data:/data` | `MINIO_ROOT_USER=minioadmin`, `MINIO_ROOT_PASSWORD=minioadmin123`, `MINIO_BROWSER=on` | Không có | `curl -f http://localhost:9000/minio/health/live` |
| **MinIO Init (MC Job)**| Chart v5.4.0 | `quay.io/minio/mc:RELEASE.2024-11-21T17-21-54Z` | Không có | `MC_HOST_myminio=http://minioadmin:minioadmin123@minio:9000` | `minio` | Lệnh bash: `mc mb -p myminio/iceberg-warehouse` |
| **Project Nessie** | Chart v0.108.0 | `ghcr.io/projectnessie/nessie:0.108.0` | Không có | `NESSIE_VERSION_STORE_TYPE=JDBC2`, `QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://nessie-db:5432/nessie`, `QUARKUS_DATASOURCE_USERNAME=nessie`, `QUARKUS_DATASOURCE_PASSWORD=nessie` | `nessie-db` | `curl -f http://localhost:19120/q/health/ready` |
| **PostgreSQL (Nessie)** | Standalone v16 | `postgres:16-alpine` | `nessie-db-data:/var/lib/postgresql/data` | `POSTGRES_DB=nessie`, `POSTGRES_USER=nessie`, `POSTGRES_PASSWORD=nessie` | Không có | `pg_isready -U nessie` |
| **Trino Engine** | Chart v1.42.2 (v480) | `trinodb/trino:480` | `./local-config/trino:/etc/trino:ro` | `AWS_ACCESS_KEY_ID=minioadmin`, `AWS_SECRET_ACCESS_KEY=minioadmin123` | `nessie`, `minio` | `curl -f http://localhost:8080/v1/info` |
| **StarRocks FE** | Chart v1.11.5 (v4.1) | `starrocks/fe-ubuntu:4.1-latest` | `starrocks-fe-meta:/opt/starrocks/fe/meta` | `LOG_DIR=/opt/starrocks/fe/log` | Không có | `curl -f http://localhost:8030/api/health` |
| **StarRocks BE** | Chart v1.11.5 (v4.1) | `starrocks/be-ubuntu:4.1-latest` | `starrocks-be-storage:/opt/starrocks/be/storage` | Không có | `starrocks-fe` | `curl -f http://localhost:8040/api/health` |
| **OpenMetadata Server**| Chart v1.12.11 | `docker.getcollate.io/openmetadata/server:1.12.11` | Không có | `DB_DRIVER_CLASS=org.postgresql.Driver`, `DB_HOST=openmetadata-db`, `DB_PORT=5432`, `DB_USER=openmetadata_user`, `ELASTICSEARCH_HOST=opensearch`, `ELASTICSEARCH_PORT=9200` | `openmetadata-db`, `opensearch` | `curl -f http://localhost:8585/api/v1/system/status` |
| **PostgreSQL (OM)** | Standalone v16 | `postgres:16-alpine` | `om-db-data:/var/lib/postgresql/data` | `POSTGRES_DB=openmetadata_db`, `POSTGRES_USER=openmetadata_user`, `POSTGRES_PASSWORD=openmetadata_pass`| Không có | `pg_isready -U openmetadata_user` |
| **OpenSearch Engine** | Single-node v2.x | `opensearchproject/opensearch:2.11.0` | `opensearch-data:/usr/share/opensearch/data` | `discovery.type=single-node`, `plugins.security.disabled=true`, `OPENSEARCH_JAVA_OPTS=-Xms512m -Xmx512m` | Không có | `curl -f http://localhost:9200/_cluster/health` |
| **Apache Airflow Web**| Chart v1.22.0 (v3.2.2)| `thinh661/airflow:3.2.2-keycloak` | Không có | `AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql+psycopg2://airflow:airflow@airflow-db:5432/airflow`, `AIRFLOW__CORE__LOAD_EXAMPLES=False` | `airflow-db` | `curl -f http://localhost:8080/health` |
| **PostgreSQL (Airflow)**| Standalone v16 | `postgres:16-alpine` | `airflow-db-data:/var/lib/postgresql/data` | `POSTGRES_DB=airflow`, `POSTGRES_USER=airflow`, `POSTGRES_PASSWORD=airflow`| Không có | `pg_isready -U airflow` |
| **JupyterHub** | Chart v4.3.5 (v5.4.6)| `quay.io/jupyterhub/jupyterhub:5.4.6` | Không có | `OAUTH_CLIENT_ID=jupyterhub`, `OAUTH_CLIENT_SECRET=jupyterhub-secret` | `keycloak` | `curl -f http://localhost:8081/hub/health` |
| **Grafana Server** | Chart v87.0.0 | `grafana/grafana:11.0.0` | `grafana-storage:/var/lib/grafana` | `GF_SECURITY_ADMIN_USER=admin`, `GF_SECURITY_ADMIN_PASSWORD=admin`, `GF_SECURITY_ALLOW_EMBEDDING=true` | Không có | `curl -f http://localhost:3000/api/health` |

---

## 6. Docker Conversion Plan (Kế Hoạch Chuyển Đổi Sang Docker Compose)

Để chuyển tiếp chính xác các nguyên mẫu Kubernetes sang môi trường Docker Desktop, áp dụng bảng chuyển đổi cấu trúc quy chuẩn sau:

### 6.1. Nguyên Tắc Ánh Xạ K8s sang Docker Compose
*   **Kubernetes Service (ClusterIP):** Ánh xạ trực tiếp thành tên Service bên trong khối `services:` của `docker-compose.yml` thuộc mạng bridge chung (`lakehouse-net`). Các container tự động phân giải DNS theo tên service.
*   **Kubernetes Service (NodePort/Ingress):** Ánh xạ thành thuộc tính `ports:` (ví dụ `- "3000:3000"`, `- "8080:8080"`) ra host machine.
*   **PersistentVolumeClaim (PVC / Longhorn):** Ánh xạ thành Docker Named Volume (ví dụ `minio-data:/data`) được khai báo tại khối `volumes:` ở cuối file compose.
*   **ConfigMap / Secret / Realm Import JSON:** Ánh xạ thành cơ chế **Bind Mount Read-Only** (ví dụ `- ./local-config/keycloak/realm.json:/opt/keycloak/data/import/realm.json:ro`).
*   **Kubernetes InitContainers / Job:** Chuyển hóa thành container phụ trợ thực thi 1 lần với thuộc tính `restart: "no"` kết hợp với điều kiện kiểm soát luồng `depends_on: { target_service: { condition: service_healthy } }`.

### 6.2. Cấu Trúc Khung Khối `docker-compose.yml` (Kiến Trúc Đề Xuất)
```yaml
version: '3.8'

networks:
  lakehouse-net:
    driver: bridge
    name: lakehouse-net

volumes:
  keycloak-db-data:
  minio-data:
  nessie-db-data:
  om-db-data:
  opensearch-data:
  airflow-db-data:

services:
  # ---------------------------------------------------------
  # 1. CORE DATABASES & STORAGE LAYER
  # ---------------------------------------------------------
  keycloak-db:
    image: postgres:16-alpine
    container_name: keycloak-db
    networks: [lakehouse-net]
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak
    volumes: [keycloak-db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U keycloak"]
      interval: 5s
      retries: 5

  minio:
    image: quay.io/minio/minio:RELEASE.2024-12-18T13-15-44Z
    container_name: minio
    command: server /data --console-address ":9001"
    networks: [lakehouse-net]
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
      MINIO_BROWSER: "on"
    volumes: [minio-data:/data]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      retries: 5

  minio-init:
    image: quay.io/minio/mc:RELEASE.2024-11-21T17-21-54Z
    container_name: minio-init
    networks: [lakehouse-net]
    depends_on:
      minio: { condition: service_healthy }
    entrypoint: >
      /bin/sh -c "
      mc alias set myminio http://minio:9000 minioadmin minioadmin123 &&
      mc mb -p myminio/iceberg-warehouse &&
      mc mb -p myminio/spark-events-batch &&
      mc mb -p myminio/spark-events-connect &&
      mc mb -p myminio/airflow-logs &&
      exit 0"
    restart: "no"

  # ---------------------------------------------------------
  # 2. IDENTITY & SSO LAYER
  # ---------------------------------------------------------
  keycloak:
    image: quay.io/keycloak/keycloak:26.6.2
    container_name: keycloak
    command: start-dev --import-realm
    networks: [lakehouse-net]
    ports: ["8080:8080"]
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://keycloak-db:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    volumes:
      # Bind mount realm import từ lakehouse_infra
      - ../lakehouse_infra/rke2/keycloak/manifests/realm-import.json:/opt/keycloak/data/import/realm.json:ro
    depends_on:
      keycloak-db: { condition: service_healthy }
    healthcheck:
      test: ["CMD-SHELL", "exec 3<>/dev/tcp/localhost/8080"]
      interval: 10s
      retries: 10

  # ---------------------------------------------------------
  # 3. METADATA CATALOGS & QUERY ENGINES
  # ---------------------------------------------------------
  nessie-db:
    image: postgres:16-alpine
    container_name: nessie-db
    networks: [lakehouse-net]
    environment:
      POSTGRES_DB: nessie
      POSTGRES_USER: nessie
      POSTGRES_PASSWORD: nessie
    volumes: [nessie-db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nessie"]
      interval: 5s
      retries: 5

  nessie:
    image: ghcr.io/projectnessie/nessie:0.108.0
    container_name: nessie
    networks: [lakehouse-net]
    ports: ["19120:19120"]
    environment:
      NESSIE_VERSION_STORE_TYPE: JDBC2
      QUARKUS_DATASOURCE_JDBC_URL: jdbc:postgresql://nessie-db:5432/nessie
      QUARKUS_DATASOURCE_USERNAME: nessie
      QUARKUS_DATASOURCE_PASSWORD: nessie
    depends_on:
      nessie-db: { condition: service_healthy }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:19120/q/health/ready"]
      interval: 10s
      retries: 5

  trino:
    image: trinodb/trino:480
    container_name: trino
    networks: [lakehouse-net]
    ports: ["8083:8080"]
    volumes:
      - ./local-config/trino:/etc/trino:ro
    depends_on:
      nessie: { condition: service_healthy }
      minio-init: { condition: service_completed_successfully }
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/v1/info"]
      interval: 15s
      retries: 6

  starrocks-fe:
    image: starrocks/fe-ubuntu:4.1-latest
    container_name: starrocks-fe
    networks: [lakehouse-net]
    ports: ["9030:9030", "8030:8030"]
    environment:
      JAVA_OPTS: "-Xmx1024m"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8030/api/health"]
      interval: 15s
      retries: 6

  # ---------------------------------------------------------
  # 4. VDP PORTAL (FRONTEND BFF LAYER)
  # ---------------------------------------------------------
  vdp-portal:
    build:
      context: ./vdp-portal
      dockerfile: Dockerfile
    container_name: vdp-portal
    networks: [lakehouse-net]
    ports: ["3000:3000"]
    env_file:
      - ./vdp-portal/.env.docker.local
    depends_on:
      keycloak: { condition: service_healthy }
      trino: { condition: service_healthy }
```

---

## 7. Local Deployment Plan & Verification Checklist

Quy trình chi tiết 6 bước dựng hạ tầng cục bộ trên Docker Desktop và kiểm chứng chất lượng end-to-end:

### Bước 1: Chuẩn bị Host Mạng & Lớp Lưu Trữ Docker
*   **Thao tác:** Bổ sung ánh xạ tên miền vào file `/etc/hosts` trên máy trạm (Mac/Linux: `/etc/hosts`, Windows: `C:\Windows\System32\drivers\etc\hosts`):
    ```text
    127.0.0.1   portal.lakehouse.local keycloak.lakehouse.local minio.lakehouse.local trino.lakehouse.local
    ```
    Tạo mạng bridge và các volume lưu trữ dữ liệu cục bộ:
    ```bash
    docker network create lakehouse-net
    ```
*   **Verify:** `docker network ls | grep lakehouse-net` hiển thị mạng bridge thành công. `ping -c 1 keycloak.lakehouse.local` phân giải chính xác về `127.0.0.1`.

### Bước 2: Khởi động Lớp Cơ Sở Dữ Liệu & Object Store (Layer 0)
*   **Thao tác:** Khởi chạy các database PostgreSQL và MinIO:
    ```bash
    docker compose up -d keycloak-db nessie-db minio
    ```
*   **Verify Database:** Chạy kiểm tra sẵn sàng `docker exec keycloak-db pg_isready -U keycloak` trả về `accepting connections`.
*   **Verify Storage:** Truy cập trình duyệt `http://localhost:9001` (Tài khoản: `minioadmin` / `minioadmin123`). Đăng nhập thành công vào MinIO Web Console.

### Bước 3: Khởi tạo Dữ liệu & Dịch vụ Xác thực Keycloak (Layer 1)
*   **Thao tác:** Chạy job tạo bucket MinIO và khởi chạy Keycloak SSO:
    ```bash
    docker compose up -d minio-init keycloak
    ```
*   **Verify Storage Buckets:** Kiểm tra log job `docker logs minio-init` xác nhận hiển thị `Bucket created successfully` cho các bucket `iceberg-warehouse`, `spark-events-*`.
*   **Verify Authentication:** Gọi API `curl -s http://localhost:8080/realms/lakehouse/.well-known/openid-configuration | grep issuer` trả về URL `https://keycloak.lakehouse.local/realms/lakehouse`. Đăng nhập vào trang quản trị Keycloak (`http://localhost:8080/admin`) xác nhận client `vdp-portal` và các role `DE`, `DS`, `DA`, `Admin` đã được import từ realm JSON.

### Bước 4: Khởi chạy Data Catalog & Query Engines (Layer 2 & 3)
*   **Thao tác:** Khởi chạy Nessie Catalog, Trino Coordinator và StarRocks FE:
    ```bash
    docker compose up -d nessie trino starrocks-fe
    ```
*   **Verify Metadata Catalog:** Kiểm tra Nessie REST API:
    ```bash
    curl -f http://localhost:19120/api/v2/config
    # Kết quả mong đợi: {"defaultBranch":"main","maxApiVersion":2}
    ```
*   **Verify Query Engine:** Truy vấn thử qua Trino CLI hoặc REST API:
    ```bash
    curl -f http://localhost:8083/v1/info
    # Kết quả mong đợi: {"nodeVersion":{"version":"480"},"environment":"production",...}
    ```
*   **Verify StarRocks Health:** Gọi HTTP health check: `curl -f http://localhost:8030/api/health` trả về `OK`.

### Bước 5: Build & Triển Khai VDP Portal BFF (Layer 4)
*   **Thao tác:** Chuẩn bị file biến môi trường `./vdp-portal/.env.docker.local` với cấu hình trỏ vào hostname của container Docker Compose:
    ```env
    AUTH_SECRET=a8f9b2c3d4e5f6a7b8c9d0e1f2a3b4c5
    NEXTAUTH_URL=http://portal.lakehouse.local:3000
    KEYCLOAK_ISSUER=http://keycloak.lakehouse.local:8080/realms/lakehouse
    KEYCLOAK_INTERNAL_URL=http://keycloak:8080
    KEYCLOAK_CLIENT_ID=vdp-portal
    KEYCLOAK_CLIENT_SECRET=vdp-portal-oidc-client-secret-123456
    INTERNAL_TRINO_URL=http://trino:8080
    INTERNAL_NESSIE_API=http://nessie:19120/api/v2
    INTERNAL_MINIO_ENDPOINT=http://minio:9000
    INTERNAL_MINIO_ACCESS_KEY=minioadmin
    INTERNAL_MINIO_SECRET_KEY=minioadmin123
    STARROCKS_HOST=starrocks-fe
    STARROCKS_PORT=9030
    STARROCKS_USER=root
    STARROCKS_PASSWORD=
    ```
    Khởi chạy Portal container:
    ```bash
    docker compose up -d --build vdp-portal
    ```
*   **Verify Endpoint & BFF Proxy:** Truy cập `http://portal.lakehouse.local:3000`. Trình duyệt tự động redirect sang trang đăng nhập Keycloak (`http://keycloak.lakehouse.local:8080/...`). Đăng nhập bằng tài khoản role `DE`, sau khi xác thực thành công quay trở lại trang Dashboard.
*   **Verify Module Health:** Gọi API kiểm tra sức khỏe của Portal: `curl -f http://localhost:3000/api/dashboard/summary` (kèm Bearer Token hoặc Cookie session hợp lệ), xác nhận trả về khối `health: [...]` với trạng thái `healthy` cho Trino, Nessie, MinIO, StarRocks.

---

## 8. Các Thay Đổi Cần Thực Hiện Trong `lakehouse_portal`

Phân loại cụ thể mức độ cần thiết đối với từng thay đổi mã nguồn hoặc cấu hình trong kho `lakehouse_portal` khi chạy môi trường local Docker Desktop:

| Mã Thay Đổi | Vị Trí Tập Tin | Mô Tả Yêu Cầu Thay Đổi | Phân Loại | Lý Do |
|---|---|---|:---:|---|
| **REQ-1** | `vdp-portal/.env.local` (Tạo mới từ `.env.example`) | Cấu hình toàn bộ các biến `INTERNAL_*` trỏ sang hostname dịch vụ trong Docker Compose (ví dụ: `http://trino:8080`, `http://keycloak:8080`) thay vì `.svc.cluster.local`. | 🔴 **Bắt buộc** | BFF Next.js chạy trong container Docker Compose chỉ phân giải được DNS mạng bridge cục bộ, không tiếp cận được DNS của K8s ClusterIP. |
| **REC-1** | `vdp-portal/src/lib/services/k8s.ts` | Thêm bọc `try/catch` xung quanh việc khởi tạo `new k8s.KubeConfig().loadFromDefault()` hoặc bọc các hàm `listSparkApplications()`, `listVolcanoQueues()` trả về mảng rỗng `[]` khi chạy ngoài cụm K8s. | 🟡 **Nên làm** | Tránh gây lỗi 500 Unhandled Exception tại các route `/api/spark/applications` khi chạy môi trường thuần Docker Compose không có K8s API Server (đồng bộ với cách xử lý graceful fallback tại `src/app/api/admin/cluster/health/route.ts`). |
| **OPT-1** | `vdp-portal/src/components/layout/*` | Sửa đổi giao diện shadcn/ui hoặc thêm label hiển thị môi trường "Local Docker Dev". | 🟢 **Không cần thiết** | Không ảnh hưởng đến luồng kiểm chứng chức năng kỹ thuật và kết nối hệ thống. |

---

## 9. Đề Xuất Parallel Agents (Thiết Kế Phân Tác Vụ Song Song)

Khi bắt đầu chuyển sang giai đoạn Execution, công việc có thể chia nhỏ cho **7 Parallel Agents** hoạt động độc lập nhằm tăng tốc độ hoàn thiện hạ tầng và kiểm chứng mã nguồn:

```mermaid
graph LR
    Subgraph Execution Phase Orchestrator
        Orchestrator[Lead Antigravity Agent]
    end

    Orchestrator --> A1[Agent 1: Infra Audit & Extract]
    Orchestrator --> A2[Agent 2: Config & Realm Seed]
    Orchestrator --> A3[Agent 3: Docker Conversion Builder]
    
    A3 --> A4[Agent 4: Database & Storage Deployer]
    A3 --> A5[Agent 5: Engines & Catalogs Deployer]
    
    A4 --> A6[Agent 6: Endpoint & Network Validator]
    A5 --> A6
    
    A6 --> A7[Agent 7: Portal E2E BFF Tester]
```

1.  **Infrastructure Audit Agent:** Chuyên trách đọc, trích xuất cấu hình tĩnh từ các file Helm values trong `lakehouse_infra/rke2/` và tạo bộ cấu hình rút gọn cho môi trường local.
2.  **Configuration Audit Agent:** Kiểm tra sự nhất quán của biến môi trường, trích xuất realm JSON từ `keycloak/manifests/` chuẩn bị sẵn file seed cho Docker volume.
3.  **Docker Conversion Agent:** Viết hoàn chỉnh file `docker-compose.yml` và các file `env_file` cục bộ cho từng dịch vụ dựa trên bản mapping trong kế hoạch này.
4.  **Endpoint Validation Agent:** Chạy tự động các script `curl` kiểm tra healthcheck từng container sau khi khởi động, đảm bảo cổng mạng phản hồi đúng HTTP status.
5.  **Dependency Validation Agent:** Kiểm tra khả năng tương tác giữa các tầng (Nessie kết nối Postgres thành công, Trino kết nối Nessie và MinIO S3 thành công).
6.  **Local Deployment Agent:** Điều phối trật tự khởi động container theo đúng Startup Order (Layer 0 đến Layer 4), theo dõi resource RAM/CPU host machine.
7.  **Portal Validation Agent:** Giả lập trình duyệt (hoặc dùng Playwright/curl proxy), gọi qua lớp BFF Next.js `/api/*` để xác minh token JWT và quyền RBAC theo từng Keycloak Role (`DE`, `DA`, `Viewer`).

---

## 10. Acceptance Criteria, Rollback Plan & Risk Assessment

### 10.1. Acceptance Criteria (Tiêu Chí Nghiệm Thu)
*   [ ] Toàn bộ các container cốt lõi (`vdp-portal`, `keycloak`, `minio`, `nessie`, `trino`, `starrocks-fe`, `postgres`) đều đạt trạng thái `Up (healthy)` khi chạy lệnh `docker compose ps`.
*   [ ] Đăng nhập thành công qua SSO OIDC trên trình duyệt tại domain `http://portal.lakehouse.local:3000` với tài khoản Keycloak đã import.
*   [ ] API `/api/dashboard/summary` của Portal trả về HTTP 200 kèm danh sách trạng thái `status: 'healthy'` cho tất cả các backend core.
*   [ ] Truy vấn SQL thử nghiệm qua module SQL Editor (`/api/trino/query` hoặc `/api/starrocks`) thực thi thành công trả về dữ liệu.
*   [ ] Không xảy ra tình trạng rò rỉ bộ nhớ hoặc hệ thống vượt quá 12GB RAM sử dụng trên máy host trong chế độ idle.

### 10.2. Rollback Plan (Kế Hoạch Khôi Phục & Dọn Dẹp)
Nếu quá trình triển khai local bị lỗi xung đột cổng hoặc lỗi dữ liệu corrupt trong các volume:
```bash
# 1. Dừng và xóa toàn bộ container, mạng bridge và persistent volumes cục bộ
cd lakehouse_portal/vdp-portal
docker compose -f docker-compose.yml down -v --remove-orphans

# 2. Xóa mạng bridge nếu còn tồn tại
docker network rm lakehouse-net 2>/dev/null || true

# 3. Khôi phục lại file cấu hình môi trường về bản gốc
git checkout -- .env.local
```

### 10.3. Risk Assessment (Đánh Giá Rủi Ro)

| Rủi Ro Nhận Diện | Nguyên Nhân Tiềm Ẩn | Khả Năng Xảy Ra | Mức Độ Tác Động | Kế Hoạch Giảm Thiểu (Mitigation Strategy) |
|---|---|:---:|:---:|---|
| **Xung đột cổng cục bộ (Port Conflict)** | Máy host đã chạy sẵn dịch vụ PostgreSQL (5432), MySQL (3306), hoặc web server (80/8080/3000). | Cao | Trung bình | Đổi các cổng ánh xạ ra máy host (`host_port:container_port`) cho các database thành `54321:5432`, `54322:5432`. Cổng bên trong mạng bridge không bị ảnh hưởng. |
| **Quá tải bộ nhớ RAM (OOM Killed)** | Chạy song song Trino, StarRocks BE, Airflow và Next.js trên laptop có RAM dưới 16GB. | Trung bình | Cao | Giới hạn biến môi trường JVM/C++ Heap size tối thiểu trong `docker-compose.yml` (`JAVA_OPTS=-Xmx1024m` cho Trino/FE, `mem_limit=3G` cho StarRocks BE). |
| **Lỗi SSL/TLS Handshake trong BFF**| Keycloak hoặc Airflow bật yêu cầu chứng chỉ HTTPS tự ký, trong khi Node.js Next.js từ chối kết nối tự ký. | Cao | Cao | Bổ sung biến môi trường `NODE_TLS_REJECT_UNAUTHORIZED=0` cho container `vdp-portal` trong môi trường dev local hoặc sử dụng HTTP thuần giữa BFF và internal containers. |
| **Lỗi mất kết nối K8s CRD API**| Portal gọi SDK Kubernetes để list Spark/Volcano jobs nhưng không có K8s API trong Docker Compose. | Chắc chắn | Trung bình | Áp dụng thay đổi REC-1 (bọc try-catch graceful fallback trong `k8s.ts`) đảm bảo UI không bị crash toàn bộ trang Dashboard. |
