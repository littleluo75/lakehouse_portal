# Kiến Trúc Hệ Thống VDP Portal (System Architecture)

Tài liệu này mô tả chi tiết kiến trúc tổng thể, mô hình bảo mật, luồng xác thực và cơ chế giao tiếp giữa Cổng thông tin hợp nhất **VDP Portal** với các dịch vụ lõi của VNPT Data Platform trong cụm Kubernetes.

---

## 1. Tổng Quan Kiến Trúc BFF (Backend-For-Frontend)

VDP Portal áp dụng mô hình **Backend-For-Frontend (BFF)** dựa trên Next.js 16 App Router. Thay vì để trình duyệt (Single Page Application - SPA) gọi trực tiếp tới các dịch vụ phân tán như Airflow, Trino, MinIO, hệ thống thiết lập một lớp trung gian (BFF Proxy) nằm trên server-side của Next.js.

### Tại sao áp dụng mô hình BFF?
1. **Giải quyết triệt để bài toán CORS (Cross-Origin Resource Sharing):** Các dịch vụ nội bộ chạy trên K8s ClusterIP không cần cấu hình CORS cho trình duyệt bên ngoài. Mọi giao tiếp từ trình duyệt đến portal đều cùng origin (`https://portal.lakehouse.local`).
2. **Bảo mật Credentials tuyệt đối (Zero Client-Side Credentials):** Các thông tin nhạy cảm như Basic Auth credentials (`admin`/`admin`), MinIO Secret Key, K8s ServiceAccount Token, hoặc Keycloak Client Secret chỉ lưu tại RAM của server Next.js (`process.env`), hoàn toàn không bị lộ ra bundle JavaScript phía client.
3. **Chuẩn hóa & Chuẩn bị dữ liệu (Response Shaping):** Lớp BFF có nhiệm vụ biến đổi payload phức tạp từ backend (như K8s CRD raw JSON, Trino statement stats) thành format chuẩn `{ success: boolean, data?: T, error?: string }` dễ tiêu thụ cho giao diện UI.
4. **Quản lý phiên tập trung (Centralized Session & Token Management):** Client chỉ giữ một HTTP-Only, Secure Session Cookie. BFF tự động đính kèm Access Token hoặc Basic Auth vào header `Authorization` khi giao tiếp với ClusterIP.

---

## 2. Luồng Xử Lý Yêu Cầu (Request Flow Diagram)

Dưới đây là sơ đồ ASCII minh họa hành trình của một request từ người dùng khi thao tác trên Portal:

```text
 [ Trình Duyệt Người Dùng ]
             │
             │ 1. HTTP GET /api/airflow/dags (kèm Session Cookie)
             ▼
 ┌──────────────────────────────────────────────────────────────────────────────────────┐
 │ NEXT.JS BFF LAYER (vdp-portal pod trong K8s)                                        │
 │                                                                                      │
 │  ┌───────────────────────┐   ┌──────────────────────────┐   ┌─────────────────────┐  │
 │  │ 2. API Route Handler  │──▶│ 3. createInternalClient  │──▶│ 4. HTTP Fetch       │  │
 │  │  (Validate Session &  │   │  Inject Auth Header:     │   │  Target: ClusterIP  │  │
 │  │   RBAC Permissions)   │   │  Bearer <access_token>   │   │  Timeout: 30000ms   │  │
 │  └───────────────────────┘   └──────────────────────────┘   └─────────────────────┘  │
 └──────────────────────────────────────────────────────────────────────────┬───────────┘
                                                                            │ 5. Proxy
                                                                            ▼
                                                ┌──────────────────────────────────────┐
                                                │ K8s Internal ClusterIP Service       │
                                                │ (http://airflow-webserver...:8080)   │
                                                └──────────────────────────────────────┘
```

---

## 3. Luồng Xác Thực (Authentication & SSO Flow)

VDP Portal sử dụng **Auth.js v5** (`next-auth`) tích hợp với **Keycloak SSO** (OIDC Authorization Code Flow):

1. **Đăng nhập:** Người dùng truy cập Portal chưa có session -> Redirect tới Keycloak Login Page (`https://keycloak.lakehouse.local/realms/lakehouse/protocol/openid-connect/auth`).
2. **Cấp phát Token:** Sau khi xác thực thành công, Keycloak trả về Authorization Code cho callback `/api/auth/callback/keycloak`. Auth.js trao đổi code lấy `id_token`, `access_token`, và `refresh_token`.
3. **Trích xuất vai trò (Role Extraction):** Trong `jwt` callback (`src/lib/auth.ts`), hệ thống giải mã JWT từ Keycloak, trích xuất danh sách vai trò từ cấu trúc `realm_access.roles` (ví dụ: `Admin`, `DE`, `DS`, `DA`, `Op`).
4. **Tự động làm mới (Token Refresh):** Khi token sắp hết hạn, hàm refresh trong `auth.ts` tự động gửi `refresh_token` tới endpoint token của Keycloak để nhận cặp token mới, đảm bảo trải nghiệm liên tục không bị đăng xuất giữa chừng.

---

## 4. Mô Hình Phân Quyền (RBAC Model)

Phân quyền được kiểm soát theo 2 lớp bảo mật song song:

### Lớp 1: Edge Proxy Guard (`src/proxy.ts`)
Tất cả request điều hướng vào nhóm route `(dashboard)/` đều bị chắn bởi `proxy.ts`. Ma trận kiểm soát:

| Route UI | Vai Trò Cho Phép (Roles) | Xử Lý Khi Vi Phạm |
|---|---|---|
| `/workflows` | `DE`, `Op`, `Admin`, `SuperAdmin` | Redirect `/403` |
| `/catalog` | `DE`, `DS`, `DA`, `BA`, `Admin`, `SuperAdmin` | Redirect `/403` |
| `/query` | `DE`, `DS`, `DA`, `Admin`, `SuperAdmin` | Redirect `/403` |
| `/notebooks` | `DE`, `DS`, `Admin`, `SuperAdmin` | Redirect `/403` |
| `/storage` | `DE`, `DS`, `Op`, `Admin`, `SuperAdmin` | Redirect `/403` |
| `/streams` | `DE`, `Op`, `Admin`, `SuperAdmin` | Redirect `/403` |
| `/jobs` | `DE`, `Op`, `Admin`, `SuperAdmin` | Redirect `/403` |
| `/observability`| `Op`, `Admin`, `SuperAdmin`, `PM` | Redirect `/403` |
| `/admin` | `SuperAdmin` | Redirect `/403` |

### Lớp 2: Component-level Role Guard (`<RoleGuard>`)
Dùng để ẩn/hiện hoặc vô hiệu hóa các nút thao tác nhạy cảm ngay trên giao diện:
- **`src/components/modules/airflow/workflows-client.tsx`**: Nút **"Trigger DAG"** được bọc bởi `<RoleGuard allowedRoles={['DE', 'Op', 'Admin', 'SuperAdmin']}>`.
- **`src/components/modules/sql/sql-editor-client.tsx`**: Nút **"Thực thi Query"** được kiểm tra; nếu người dùng chỉ có vai trò `DA` (Data Analyst) và câu truy vấn bắt đầu bằng các từ khóa ghi/đổi (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE`), thao tác bị chặn ngay lập tức hiển thị cảnh báo từ chối quyền thực thi.

---

## 5. Bản Đồ Dịch Vụ Nội Bộ (Internal Service Map)

Bảng dưới đây tổng hợp các cấu hình kết nối từ BFF tới các dịch vụ thực tế trong Kubernetes (được khởi tạo trong `src/lib/services/`):

| Tên Service | Internal Endpoint (ClusterIP DNS) | Auth Method | Thư Viện Kết Nối / Module BFF |
|---|---|---|---|
| **Apache Airflow** | `http://airflow-webserver.airflow.svc.cluster.local:8080/api/v1` | Bearer Token (forward từ session) | `createInternalClient` -> `/api/airflow/*` |
| **Trino OLAP** | `http://trino.trino.svc.cluster.local:8080` | None (Gửi `X-Trino-User`) | `createInternalClient` -> `/api/trino/*` |
| **Project Nessie** | `http://nessie.nessie.svc.cluster.local:19120/api/v2` | None | `createInternalClient` |
| **OpenMetadata** | `http://openmetadata.openmetadata.svc.cluster.local:8585/api/v1`| Basic Auth (`admin`/`admin`) | `createInternalClient` -> `/api/openmetadata/*` |
| **JupyterHub** | `http://hub.jupyter.svc.cluster.local:8081/hub/api` | Bearer Token | `createInternalClient` -> `/api/jupyter/*` |
| **Grafana** | `http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80`| Basic Auth (`admin`/`password`)| `createInternalClient` -> `/api/observability/*` |
| **MinIO Storage** | `http://minio.minio.svc.cluster.local:9000` | AWS Signature V4 (`minioadmin`) | `@aws-sdk/client-s3` (pathStyle: true) |
| **StarRocks DW** | `10.167.70.13:30030` (NodePort / Bastion) | MySQL Native (`root`/rỗng) | `mysql2` connection pool |
| **Spark Operator**| `https://kubernetes.default.svc` | K8s ServiceAccount RBAC | `@kubernetes/client-node` |

---

## 6. Luồng Dữ Liệu Đặc Thù Của Các Module Quan Trọng

### 6.1. Trino HTTP Polling Protocol (`/api/trino/query`)
Khác với các cơ sở dữ liệu truyền thống dùng kết nối giữ trọn gói (JDBC/TCP), Trino sử dụng mô hình HTTP Polling bất đồng bộ:
1. Client gửi câu lệnh SQL qua POST `/api/trino/query`.
2. BFF gửi POST tới `http://trino...:8080/v1/statement`. Trino trả về ngay object chứa `nextUri` và trạng thái `QUEUED` hoặc `RUNNING`.
3. Thay vì trả về `nextUri` cho trình duyệt (làm lộ IP nội bộ và bắt client tự poll), **BFF tự động lặp lại vòng lặp polling** (gọi GET tới `nextUri` nội bộ, tối đa 60 lần, chu kỳ 500ms) cho tới khi trạng thái chuyển sang `FINISHED`, `FAILED`, hoặc `CANCELED`.
4. Khi có dữ liệu hoàn chỉnh, BFF map các columns và data rows trả về 1 block duy nhất cho trình duyệt.

### 6.2. Spark Applications CRD Query (`/api/spark/jobs`)
Để lấy danh sách công việc Spark, BFF sử dụng `@kubernetes/client-node` gọi trực tiếp vào K8s API Server:
1. Truy vấn Custom Resource Definition (CRD) tại endpoint `apis/sparkoperator.k8s.io/v1beta2/namespaces/default/sparkapplications`.
2. Phân tích `status.applicationState.state` (`RUNNING`, `COMPLETED`, `FAILED`).
3. Tính toán thời gian thực thi (Duration) dựa trên `status.lastTransitionTime` và `status.terminationTime`.
4. Trả về metadata đã làm sạch cho UI hiển thị.
