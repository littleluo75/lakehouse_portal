# VNPT Data Lighthouse

> Single Pane of Glass portal cho VNPT Data Platform
> Tích hợp: Apache Airflow, Trino, StarRocks, Nessie, MinIO, OpenMetadata, JupyterHub, Grafana, Apache Spark, Apache Kafka

## Yêu cầu môi trường
- Node.js: `>= 20.0.0` (Khuyến nghị `v22.x` tương đương với base image `node:22-alpine` trong Dockerfile production)
- pnpm: `>= 9.0.0` (được kích hoạt qua `corepack enable pnpm`)
- Kubernetes access: Cần thiết cho local dev nếu muốn test các tính năng gọi Kubernetes API (danh sách nodes cho Dashboard health, CRD SparkApplication cho Spark Jobs)

## Cài đặt local

### 1. Clone và cài dependencies
```bash
git clone https://github.com/vnpt/lakehouse_portal.git
cd lakehouse_portal/vdp-portal
pnpm install
```

### 2. Cấu hình biến môi trường
Copy file `.env.example` thành `.env.local`:
```bash
cp .env.example .env.local
```
Giải thích các nhóm biến quan trọng:
- `AUTH_SECRET`: Khóa bảo mật bắt buộc của NextAuth v5 (Auth.js). **Lưu ý:** Dùng `AUTH_SECRET` chứ không phải `NEXTAUTH_SECRET`. Tạo bằng lệnh:
  ```bash
  openssl rand -base64 32
  ```
- `KEYCLOAK_*`: Thông tin kết nối SSO Keycloak (`KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`). Yêu cầu dịch vụ Keycloak đang chạy với realm `lakehouse`.
- `INTERNAL_*`: Các đường dẫn nội bộ (BFF → ClusterIP) tới dịch vụ hạ tầng (`INTERNAL_AIRFLOW_API`, `INTERNAL_TRINO_URL`, `INTERNAL_MINIO_ENDPOINT`, ...). Khi dev local, các hostname như `*.svc.cluster.local` chỉ resolve được khi chạy trong K8s cluster hoặc qua VPN/port-forward.
- `STARROCKS_*`: Cấu hình kết nối trực tiếp MySQL protocol tới StarRocks (`STARROCKS_HOST`, `STARROCKS_PORT`, `STARROCKS_USER`, `STARROCKS_PASSWORD`).

### 3. Chạy development server
Khởi chạy máy chủ phát triển bằng script từ `package.json`:
```bash
pnpm dev
```
Mở trình duyệt tại `http://localhost:3000` để trải nghiệm ứng dụng.

### 4. Chạy tests
Chạy bộ kiểm thử tự động (đặc biệt là các unit test cho bộ kiểm duyệt lệnh SQL `sql-guard`):
```bash
pnpm test
```
*(Lệnh này thực thi `vitest run` kiểm tra 11 test cases của `src/lib/__tests__/sql-guard.test.ts`).*

## Kiến trúc tóm tắt
VNPT Data Lighthouse áp dụng mô hình **Backend-For-Frontend (BFF)**. Trình duyệt không bao giờ giao tiếp trực tiếp với dịch vụ nội bộ (trừ các link iframe/redirect công khai).

```
[Browser] → https://portal.lakehouse.local
     │
     ▼
[Next.js App - portal.lakehouse.local]
  ├── /app/*              → Frontend pages (Server + Client Components)
  ├── /api/airflow/*      → Proxy → http://airflow-webserver.airflow.svc:8080/api/v1
  ├── /api/trino/*        → Proxy → http://trino.trino.svc:8080/v1
  ├── /api/nessie/*       → Proxy → http://nessie.nessie.svc:19120/api/v2
  ├── /api/minio/*        → Proxy → http://minio.minio.svc:9000
  ├── /api/openmetadata/* → Proxy → http://openmetadata.openmetadata.svc:8585/api/v1
  ├── /api/jupyter/*      → Proxy → http://hub.jupyter.svc:8081/hub/api
  ├── /api/volcano/*      → K8s Client SDK (CRD queries)
  └── /api/spark/*        → K8s Client SDK (SparkApplication CRD)
```

## Deploy lên Kubernetes (RKE2)

### Prerequisites
Trước khi triển khai, Infra Team cần đảm bảo 5 yêu cầu tiền điều kiện (PRs):
1. **PR-1:** Thêm Keycloak client `vdp-portal` vào `rke2/keycloak/manifests/realm-import.yaml`.
2. **PR-2:** Enable `AIRFLOW__WEBSERVER__X_FRAME_ENABLED=True` trong Airflow values.
3. **PR-3:** Enable `allow_embedding: true` trong Grafana values.
4. **PR-4:** Enable OIDC cho OpenMetadata trong `values-production.yaml`.
5. **PR-5:** Tạo thư mục `rke2/vdp_portal/` với `argocd-application.yaml` skeleton.

### Build Docker image
Đứng tại thư mục `vdp-portal`, thực hiện build image theo cấu trúc multi-stage:
```bash
docker build -t registry.lakehouse.local/data-lighthouse:latest .
```
> **Lưu ý:** Trong môi trường air-gapped cluster không có kết nối Internet ra ngoài, việc sử dụng `next/font/google` sẽ gây lỗi build. Dự án đã được chuẩn hóa sử dụng **system fonts** (sans-serif) từ bản sửa lỗi P0-T5.

### Deploy với Helm
Triển khai vào cụm K8s bằng lệnh `helm upgrade --install` kèm theo các tham số bảo mật bắt buộc:
```bash
helm upgrade --install data-lighthouse ./helm \
  --namespace lakehouse \
  --set keycloak.clientSecret="<keycloak-client-secret>" \
  --set nextauth.secret="$(openssl rand -base64 32)" \
  --set services.minio.secretKey="<minio-secret-key>" \
  --set services.openmetadata.password="<openmetadata-password>" \
  --set services.grafana.adminPassword="<grafana-admin-password>" \
  --set services.starrocks.password="<starrocks-password>"
```

### Verify deployment
Kiểm tra trạng thái hoạt động của pods, ingress và logs trong cluster:
```bash
# Kiểm tra trạng thái Pods
kubectl get pods -l app.kubernetes.io/name=data-lighthouse

# Kiểm tra Ingress host và cấu hình TLS
kubectl get ingress data-lighthouse

# Xem logs của container để đảm bảo không có lỗi kết nối BFF
kubectl logs -l app.kubernetes.io/name=data-lighthouse --tail=100 -f
```

## Cấu trúc thư mục
Cấu trúc thực tế của repository `lakehouse_portal`:
```
lakehouse_portal/
├── AGENTS.md                    # Nguồn chân lý duy nhất cho AI agents và developers
├── AUDIT-REPORT.md              # Báo cáo kiểm thử và bảo mật hệ thống
├── CHANGELOG.md                 # Lịch sử phiên bản
├── README.md                    # Tài liệu hướng dẫn setup này
├── Tasks/                       # Danh sách tasks và trạng thái hoàn thành (T01-T13, P0-T1-T5)
└── vdp-portal/                  # Thư mục mã nguồn chính của ứng dụng Next.js
    ├── Dockerfile               # Multi-stage build (Node 22 Alpine)
    ├── package.json             # Package name: data-lighthouse
    ├── helm/                    # Helm chart (Chart.yaml, values.yaml, templates/)
    ├── public/                  # Static assets
    └── src/
        ├── app/                 # Next.js App Router ((auth), (dashboard), api routes)
        ├── components/          # UI Components (shadcn/ui, layout, modules)
        ├── config/              # Cấu hình tĩnh (storage-permissions.ts)
        ├── hooks/               # Custom React hooks
        ├── lib/                 # Utilities (auth.ts, api-client.ts, sql-guard.ts, k8s-client.ts)
        ├── proxy.ts             # Route guard & RBAC enforcement
        └── types/               # TypeScript definitions
```

## Modules
Danh sách 13 modules chức năng trong VNPT Data Lighthouse cùng đường dẫn và phân quyền truy cập:

| Module | Đường dẫn | Keycloak Roles | Trạng thái |
|---|---|---|---|
| **Dashboard Trung tâm** | `/` | Tất cả roles | ✅ Hoàn thành |
| **Quản trị dòng chảy dữ liệu (Airflow)** | `/workflows` | `DE`, `Op`, `Admin`, `SuperAdmin` | ✅ Hoàn thành |
| **Khám phá siêu dữ liệu (OpenMetadata)** | `/catalog` | `DE`, `DS`, `DA`, `BA`, `Admin`, `SuperAdmin` | ✅ Hoàn thành |
| **Chất lượng dữ liệu (Data Quality)** | `/catalog` | `DE`, `DS`, `DA`, `BA`, `Admin`, `SuperAdmin` | ✅ Hoàn thành |
| **Lọc dữ liệu (SQL Editor)** | `/query` | `DE`, `DS`, `DA`, `Admin`, `SuperAdmin` *(DA read-only)* | ✅ Hoàn thành |
| **Phát triển dữ liệu (JupyterHub)** | `/notebooks` | `DE`, `DS`, `Admin`, `SuperAdmin` | ✅ Hoàn thành |
| **Quản lý lưu trữ Data Lake (MinIO)** | `/storage` | `DE`, `DS`, `Op`, `Admin`, `SuperAdmin` | ✅ Hoàn thành |
| **Quản lý chia sẻ dữ liệu (Kafka)** | `/streams` | `DE`, `Op`, `Admin`, `SuperAdmin` | ✅ Hoàn thành |
| **Quản lý tài nguyên tính toán (Spark)** | `/jobs` | `DE`, `Op`, `Admin`, `SuperAdmin` | ✅ Hoàn thành |
| **Quan sát và giám sát (Grafana)** | `/observability` | `Op`, `Admin`, `SuperAdmin`, `PM` | ✅ Hoàn thành |
| **Quản lý dữ liệu Iceberg (Nessie)** | `/catalog` | `DE`, `DS`, `DA`, `BA`, `Admin`, `SuperAdmin` | ✅ Hoàn thành |
| **Cấu hình & Quản trị hệ thống** | `/admin` | `SuperAdmin` | ✅ Hoàn thành |

## Troubleshooting thường gặp

### 1. Lỗi AUTH_SECRET vs NEXTAUTH_SECRET
- **Biểu hiện:** Không thể xác thực phiên làm việc, lỗi giải mã JWT token hoặc vòng lặp redirect về trang login.
- **Nguyên nhân:** Từ phiên bản NextAuth v5 (Auth.js), biến môi trường bắt buộc đổi tên thành `AUTH_SECRET`. Nếu chỉ cấu hình `NEXTAUTH_SECRET`, hệ thống sẽ không nhận diện được khóa ký.
- **Khắc phục:** Đảm bảo trong `.env.local` hoặc K8s Secret có biến `AUTH_SECRET` hợp lệ (tạo bằng `openssl rand -base64 32`).

### 2. Trino timeout khi truy vấn dữ liệu lớn
- **Biểu hiện:** Gọi API `/api/trino/query` bị lỗi HTTP 504 Gateway Timeout khi câu lệnh SQL chạy quá lâu.
- **Nguyên nhân:** Next.js API Route hoặc Ingress có giới hạn thời gian phản hồi (thường 30-60 giây).
- **Khắc phục:** Kiến trúc SQL Editor đã áp dụng cơ chế bất đồng bộ theo Trino protocol: gửi request nhận `queryId`, sau đó client poll định kỳ qua `/api/trino/query/[id]` cho đến khi query hoàn tất. Đảm bảo frontend dùng đúng client `apiCall` đã tích hợp cơ chế này.

### 3. MinIO presigned URL hết hạn (Lỗi 403 Access Denied)
- **Biểu hiện:** Nhấn tải file từ trang Storage Browser nhận lỗi `AccessDenied` từ MinIO.
- **Nguyên nhân:** Để bảo mật chống rò rỉ đường dẫn tải file, Presigned URL được cấu hình TTL giảm từ 3600s xuống 900s (15 phút) sau bản vá P0. Link đã tạo nếu để quá 15 phút sẽ hết hạn.
- **Khắc phục:** Làm mới lại trang (Refresh browser) để BFF ký lại URL mới trước khi tải.

### 4. Keycloak redirect loop (Vòng lặp vô tận khi đăng nhập)
- **Biểu hiện:** Trình duyệt tải lại liên tục giữa `/login` và Keycloak SSO URL.
- **Nguyên nhân:** Do cấu hình sai `NEXTAUTH_URL` hoặc `KEYCLOAK_ISSUER`, hoặc khi Refresh Token hết hạn khiến `session.error = 'RefreshAccessTokenError'` mà client không clear được cookie.
- **Khắc phục:** Kiểm tra kỹ `KEYCLOAK_ISSUER` phải khớp chính xác Realm URL. Xóa cookie trình duyệt (`next-auth.session-token`, `__Secure-next-auth.session-token`) và đăng nhập lại.

### 5. K8s CRD permissions (ClusterRole báo lỗi Forbidden / trả về mock data)
- **Biểu hiện:** Dashboard hiển thị thông số giả định (3 nodes, 46 cores) hoặc trang Spark Jobs không load được ứng dụng.
- **Nguyên nhân:** Pod của Data Lighthouse chạy với ServiceAccount chưa được cấp quyền RBAC `get/list` trên tài nguyên `nodes` (Core API) hoặc `sparkapplications` (CRD `sparkoperator.k8s.io`).
- **Khắc phục:** Kiểm tra và áp dụng lại cấu hình ClusterRoleBinding trong `helm/templates/rbac.yaml`:
  ```bash
  kubectl apply -f helm/templates/rbac.yaml
  ```

## Contributing
Quy trình phát triển tính năng và đóng góp mã nguồn vào VNPT Data Lighthouse:
1. **Đọc kỹ chuẩn mực:** Xem `AGENTS.md` để nắm rõ kiến trúc BFF, quy ước đặt tên và yêu cầu bảo mật.
2. **Tạo Task theo dõi:** Tạo hoặc mở file task trong thư mục `Tasks/` tương ứng với tính năng.
3. **Implement & Kiểm thử:** Viết mã nguồn tuân thủ TypeScript strict mode, không sử dụng `any`, không để lại `console.log`. Viết unit test nếu có logic phức tạp (như `sql-guard`).
4. **Xác minh toàn diện:** Chạy `pnpm test`, `pnpm build` và `pnpm lint` trong `vdp-portal` để đảm bảo không lỗi build.
5. **Tạo PR:** Cập nhật trạng thái trong file Task thành `[x]` và tạo Pull Request để review.