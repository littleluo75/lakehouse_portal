# AGENTS.md — VNPT Data Lighthouse

> **Nguồn chân lý duy nhất** cho toàn bộ quá trình phát triển VNPT Data Lighthouse.
> Mọi agent (Claude Code, Antigravity, AI khác) đều phải đọc file này trước khi thực thi bất kỳ task nào.
> **Cập nhật lần cuối:** 2026-06-28

---

## 1. TỔNG QUAN DỰ ÁN

**Tên sản phẩm:** VNPT Data Lighthouse
**Mục tiêu:** Giao diện web thống nhất ("Single Pane of Glass") cho toàn bộ business users và data engineers của VNPT tương tác với VNPT Data Platform — thay thế việc truy cập từng tool riêng lẻ.
**Domain:** `https://portal.lakehouse.local`
**Ngôn ngữ output:** Tiếng Việt cho UI labels/messages, tiếng Anh cho technical terms, code, comments, và tên biến.

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1 Stack kỹ thuật

| Layer | Công nghệ | Lý do chọn |
|---|---|---|
| **Frontend + BFF** | Next.js 16 (App Router) + TypeScript | Server Components tránh CORS; API Routes làm BFF tích hợp sẵn |
| **Auth** | next-auth v5 (Auth.js) + Keycloak OIDC | Tích hợp native với Keycloak realm `lakehouse` |
| **UI Components** | shadcn/ui + Tailwind CSS v4 | Không lock-in, customizable, có data table/chart |
| **Styling & Fonts** | System fonts (sans-serif) | Phù hợp môi trường air-gapped cluster (không dùng `next/font/google`) |
| **State Management** | Zustand (client state) + React Query (server state) | Nhẹ, đủ dùng |
| **Security / Guard** | `sql-guard.ts` | SQL validation layer cho role DA (comment stripping, whitelist statement) |
| **Package Manager** | pnpm | Nhanh hơn npm, monorepo-friendly |
| **Container** | Docker multi-stage build | Production image < 200MB |
| **Deploy** | Helm Chart + ArgoCD | Consistent với GitOps pattern của `lakehouse_infra` |

### 2.2 Kiến trúc BFF (Backend-for-Frontend)

```
[Browser] → https://portal.lakehouse.local
     │
     ▼
[Next.js App - portal.lakehouse.local]
  ├── /app/*           → Frontend pages (Server + Client Components)
  ├── /api/airflow/*   → Proxy → http://airflow-webserver.airflow.svc:8080/api/v1
  ├── /api/trino/*     → Proxy → http://trino.trino.svc:8080/v1
  ├── /api/nessie/*    → Proxy → http://nessie.nessie.svc:19120/api/v2
  ├── /api/minio/*     → Proxy → http://minio.minio.svc:9000
  ├── /api/openmetadata/* → Proxy → http://openmetadata.openmetadata.svc:8585/api/v1
  ├── /api/jupyter/*   → Proxy → http://hub.jupyter.svc:8081/hub/api
  ├── /api/volcano/*   → K8s Client SDK (CRD queries)
  └── /api/spark/*     → K8s Client SDK (SparkApplication CRD)
```

**Nguyên tắc BFF:**
- Browser **không bao giờ** gọi thẳng tới domain nội bộ (`*.lakehouse.local` khác portal)
- Mọi request từ browser đều qua `/api/*` của Next.js
- BFF kiểm tra Keycloak token trước khi forward xuống internal services
- BFF chạy trong cluster → gọi ClusterIP DNS, không qua Bastion/Traefik

### 2.3 Cấu trúc thư mục project

```
vdp-portal/
├── AGENTS.md                    # File này
├── Tasks/                       # Task files cho Claude Code
│   ├── T01-project-scaffold.md
│   ├── T02-auth-keycloak.md
│   ├── T03-bff-proxy-layer.md
│   ├── T04-module-airflow.md
│   ├── T05-module-openmetadata.md
│   ├── T06-module-sql-editor.md
│   ├── T07-module-jupyterhub.md
│   ├── T08-module-kafka-monitor.md
│   ├── T09-module-minio-browser.md
│   ├── T10-module-observability.md
│   ├── T11-module-spark-jobs.md
│   ├── T12-rbac-permission.md
│   └── T13-dashboard-landing.md
├── src/
│   ├── app/                     # Next.js App Router pages
│   │   ├── (auth)/              # Route group: login, callback
│   │   ├── (dashboard)/         # Route group: main app (protected)
│   │   │   ├── layout.tsx       # Dashboard shell với sidebar
│   │   │   ├── page.tsx         # Landing/Overview
│   │   │   ├── workflows/       # Airflow DAGs
│   │   │   ├── catalog/         # OpenMetadata
│   │   │   ├── query/           # SQL Editor (Trino/StarRocks)
│   │   │   ├── notebooks/       # JupyterHub
│   │   │   ├── storage/         # MinIO browser
│   │   │   ├── streams/         # Kafka monitor
│   │   │   ├── jobs/            # Spark jobs
│   │   │   ├── observability/   # Grafana embed + metrics
│   │   │   └── admin/           # User/role management (SuperAdmin only)
│   │   └── api/                 # BFF API routes
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── layout/              # Sidebar, Header, Breadcrumb
│   │   └── modules/             # Module-specific components
│   ├── config/
│   │   └── storage-permissions.ts # Allowlist phân quyền MinIO buckets theo role
│   ├── lib/
│   │   ├── auth.ts              # Auth.js config
│   │   ├── api-client.ts        # Typed API client wrappers
│   │   ├── sql-guard.ts         # SQL execution guard cho role DA
│   │   └── k8s-client.ts        # Kubernetes client cho Spark/Volcano CRDs
│   ├── proxy.ts                 # Route permissions & Auth proxy matcher
│   └── types/                   # TypeScript types toàn project
├── helm/                        # Helm chart deploy lên K8s
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
├── Dockerfile
└── .env.example
```

---

## 3. THÔNG SỐ KẾT NỐI NỘI BỘ

> **QUAN TRỌNG:** Các giá trị này dùng cho BFF chạy trong cluster (ClusterIP DNS).
> Không expose ra browser. Lưu trong Kubernetes Secret, đọc qua environment variables.

```bash
# Keycloak SSO
KEYCLOAK_ISSUER=https://keycloak.lakehouse.local/realms/lakehouse
KEYCLOAK_INTERNAL_URL=http://keycloak.keycloak.svc.cluster.local:8080
KEYCLOAK_REALM=lakehouse
KEYCLOAK_CLIENT_ID=vdp-portal
KEYCLOAK_CLIENT_SECRET=<client-secret-from-keycloak>

# Internal Service URLs (BFF → ClusterIP)
INTERNAL_AIRFLOW_API=http://airflow-webserver.airflow.svc.cluster.local:8080/api/v1
INTERNAL_TRINO_URL=http://trino.trino.svc.cluster.local:8080
INTERNAL_NESSIE_API=http://nessie.nessie.svc.cluster.local:19120/api/v2
INTERNAL_MINIO_ENDPOINT=http://minio.minio.svc.cluster.local:9000
INTERNAL_MINIO_ACCESS_KEY=<minio-access-key>
INTERNAL_MINIO_SECRET_KEY=<minio-secret-key>
INTERNAL_OPENMETADATA=http://openmetadata.openmetadata.svc.cluster.local:8585/api/v1
INTERNAL_OPENMETADATA_USERNAME=admin
INTERNAL_OPENMETADATA_PASSWORD=<openmetadata-password>
INTERNAL_JUPYTERHUB=http://hub.jupyter.svc.cluster.local:8081/hub/api
INTERNAL_GRAFANA=http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80

# StarRocks (SQL editor / dashboard health)
STARROCKS_HOST=starrocks-fe-service.starrocks.svc.cluster.local
STARROCKS_PORT=9030
STARROCKS_USER=root
STARROCKS_PASSWORD=<starrocks-password>

# Grafana basic auth
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<grafana-admin-password>

# Public URLs (cho redirect/iframe)
PUBLIC_AIRFLOW_URL=https://airflow.lakehouse.local
PUBLIC_GRAFANA_URL=https://grafana.lakehouse.local
PUBLIC_OPENMETADATA_URL=https://openmetadata.lakehouse.local
PUBLIC_JUPYTERHUB_URL=https://jupyterhub.lakehouse.local

# Portal config
AUTH_SECRET=<generate-random-32-chars>
NEXTAUTH_URL=https://portal.lakehouse.local
NEXT_PUBLIC_APP_NAME=VNPT Data Lighthouse
```

---

## 4. RBAC — PHÂN QUYỀN THEO KEYCLOAK ROLES

Roles được sync từ Keycloak realm `lakehouse` thông qua OIDC token claims.

| Keycloak Role | Quyền trên Portal |
|---|---|
| `SuperAdmin` | Toàn quyền — bao gồm trang Admin quản lý users/roles |
| `Admin` | Tất cả modules trừ trang Admin system |
| `Op` | Airflow trigger/monitor, Spark jobs, Observability |
| `DE` (Data Engineer) | Workflows, SQL Editor, Notebooks, Storage, Spark, Catalog |
| `DS` (Data Scientist) | Notebooks, SQL Editor, Storage, Catalog |
| `DA` (Data Analyst) | SQL Editor (read), Catalog, Observability (read) |
| `BA` (Business Analyst) | Dashboard overview, Catalog (read only) |
| `PM` | Dashboard overview, Observability (read) |
| `Viewer` | Dashboard overview only |

**Implementation:** Route guard được kiểm tra từ session trước mỗi route trong `(dashboard)/`. Thực tế triển khai tại `src/proxy.ts` (thay thế middleware Next.js thông thường).
> **Ghi chú K8s RBAC:** Để Dashboard hiển thị thống kê tài nguyên thực tế, ServiceAccount/ClusterRole của portal trong Kubernetes cần quyền get/list trên tài nguyên `nodes` (đã cấu hình trong `rbac.yaml` sau task P0-T2).

---

## 5. SECURITY CONSTRAINTS

### 5.1 MinIO Access Control
- Mỗi role chỉ được truy cập bucket trong allowlist (`src/config/storage-permissions.ts`)
- Presigned URL TTL: 900 giây (15 phút)
- Path traversal bị chặn ở BFF trước khi ký URL

### 5.2 SQL Execution Guard
- Role DA: chỉ SELECT/SHOW/DESCRIBE/EXPLAIN — enforce qua `src/lib/sql-guard.ts`
- Comment stripping trước khi validate (chống bypass `/* */` và `--`)
- CTE bypass bị chặn (`WITH...DELETE`)
- Unit tests tại: `src/lib/__tests__/sql-guard.test.ts`

### 5.3 Session Management
- Token refresh failure → `session.error = 'RefreshAccessTokenError'` → client redirect `/login`
- `validateApiAuth()` kiểm tra `session.error` trước khi xử lý request

---

## 6. QUY ƯỚC CODE

### 6.1 Naming conventions
- **Files/Folders:** kebab-case (`sql-editor.tsx`, `api-client.ts`)
- **Components:** PascalCase (`SqlEditor`, `DagTable`)
- **Functions/Variables:** camelCase (`fetchDagList`, `currentUser`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_QUERY_TIMEOUT`)
- **Types/Interfaces:** PascalCase với prefix I cho interface (`IDagRun`, `type DagStatus`)

### 6.2 API Routes pattern
```
/api/{module}/{resource}
/api/airflow/dags          → GET list DAGs
/api/airflow/dags/{id}     → GET single DAG
/api/airflow/dags/{id}/runs → GET DAG runs
/api/airflow/dags/{id}/trigger → POST trigger DAG
/api/trino/query           → POST execute SQL
/api/trino/query/{id}      → GET query status
```

### 6.3 Error handling
- Mọi API route trả về `{ success: boolean, data?: T, error?: string }`
- HTTP status codes chuẩn: 200, 201, 400, 401, 403, 404, 500
- Log lỗi ở BFF, không expose stack trace ra client

### 6.4 Authentication pattern
```typescript
// Mọi API route protected đều kiểm tra auth qua validateApiAuth hoặc:
const session = await auth()
if (!session || session.error === 'RefreshAccessTokenError') {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

// Check role:
if (!hasRole(session, ['DE', 'Admin', 'SuperAdmin'])) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## 7. TIỀN ĐIỀU KIỆN INFRA (PHẢI HOÀN THÀNH TRƯỚC KHI BUILD)

> Đây là việc của Infrastructure Team, không phải Claude Code.

- [ ] **PR-1:** Thêm Keycloak client `vdp-portal` vào `rke2/keycloak/manifests/realm-import.yaml`
- [ ] **PR-2:** Enable `AIRFLOW__WEBSERVER__X_FRAME_ENABLED=True` trong Airflow values
- [ ] **PR-3:** Enable `allow_embedding: true` trong Grafana values
- [ ] **PR-4:** Enable OIDC cho OpenMetadata trong `values-production.yaml`
- [ ] **PR-5:** Tạo thư mục `rke2/vdp_portal/` với `argocd-application.yaml` skeleton

---

## 8. ĐỊNH NGHĨA "DONE" CHO MỖI MODULE

Một module được coi là **Done** khi:
1. API route trả về data thực từ service (không mock)
2. UI hiển thị đúng với data thực
3. RBAC check hoạt động — role không đủ quyền thấy màn hình 403
4. Loading state và error state được xử lý
5. TypeScript không có `any` type (dùng `unknown` nếu cần)
6. Không có `console.log` trong production code
7. Không có mock data cứng trong production code
8. API routes thiếu auth bị phát hiện bởi grep check

---

## 9. NHỮNG GÌ KHÔNG LÀM

- **Không** gọi API nội bộ từ client-side (browser) — luôn qua BFF
- **Không** hardcode credentials trong source code — dùng env vars
- **Không** implement auth system tự xây — dùng Auth.js + Keycloak
- **Không** dùng `any` type trong TypeScript
- **Không** build feature admin Kubernetes (Rancher/Longhorn) — out of scope
- **Không** implement real-time streaming (WebSocket) ở phase 1
