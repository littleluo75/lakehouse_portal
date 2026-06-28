# P0-T1 — Helm Secret hoàn chỉnh + Xóa credential hardcode

**Đọc AGENTS.md trước khi thực thi.**
**Nguồn:** Opus 4.8 Critical #1

## Vấn đề
`helm/templates/secret.yaml` chỉ chứa `KEYCLOAK_*`, `NEXTAUTH_*`, `NEXT_PUBLIC_APP_NAME`.
Khoảng 20 biến còn lại (Airflow, Trino, MinIO, OpenMetadata, JupyterHub, StarRocks, Grafana...)
bị `undefined` trong cluster → app gọi backend thất bại.

**Hệ quả dây chuyền nghiêm trọng:**
- `src/lib/services/starrocks.ts` rơi về hardcode `host: '10.167.70.13', user: 'root', password: ''`
- `NEXTAUTH_SECRET` trong secret.yaml ≠ `AUTH_SECRET` mà NextAuth v5 cần → auth gãy hoàn toàn
- Dashboard `summary/route.ts` build URL `${undefined}/dags...` → fetch tới `undefined/...`

## Các bước thực hiện

### Bước 1: Sửa `helm/values.yaml` — thêm toàn bộ config blocks

Thêm vào `values.yaml` (thay thế bất kỳ block placeholder hiện có):

```yaml
# --- Keycloak ---
keycloak:
  issuer: "https://keycloak.lakehouse.local/realms/lakehouse"
  internalUrl: "http://keycloak.keycloak.svc.cluster.local:8080"
  realm: "lakehouse"
  clientId: "vdp-portal"
  clientSecret: ""          # điền qua --set hoặc external secret

# --- NextAuth (NextAuth v5 dùng AUTH_SECRET, không phải NEXTAUTH_SECRET) ---
nextauth:
  url: "https://portal.lakehouse.local"
  secret: ""                # điền qua --set hoặc external secret

# --- Internal Services ---
services:
  airflow:
    apiUrl: "http://airflow-webserver.airflow.svc.cluster.local:8080/api/v1"
    publicUrl: "https://airflow.lakehouse.local"
  trino:
    url: "http://trino.trino.svc.cluster.local:8080"
    publicUrl: "https://trino.lakehouse.local"
  nessie:
    apiUrl: "http://nessie.nessie.svc.cluster.local:19120/api/v2"
  minio:
    endpoint: "http://minio.minio.svc.cluster.local:9000"
    accessKey: "minioadmin"
    secretKey: ""           # điền qua --set
    publicUrl: "https://minio.lakehouse.local"
  openmetadata:
    apiUrl: "http://openmetadata.openmetadata.svc.cluster.local:8585/api/v1"
    publicUrl: "https://openmetadata.lakehouse.local"
  jupyterhub:
    apiUrl: "http://hub.jupyter.svc.cluster.local:8081/hub/api"
    publicUrl: "https://jupyterhub.lakehouse.local"
  grafana:
    internalUrl: "http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80"
    publicUrl: "https://grafana.lakehouse.local"
    adminPassword: ""       # điền qua --set
  starrocks:
    host: "starrocks-fe-service.starrocks.svc.cluster.local"
    port: "9030"
    user: "root"
    password: ""            # điền qua --set
  kafka:
    broker: ""              # điền nếu dùng
```

### Bước 2: Viết lại `helm/templates/secret.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: {{ include "data-lighthouse.fullname" . }}-env
  labels:
    {{- include "data-lighthouse.labels" . | nindent 4 }}
type: Opaque
stringData:
  # NextAuth v5 — phải là AUTH_SECRET (không phải NEXTAUTH_SECRET)
  AUTH_SECRET: {{ .Values.nextauth.secret | quote }}
  NEXTAUTH_URL: {{ .Values.nextauth.url | quote }}

  # Keycloak
  KEYCLOAK_ISSUER: {{ .Values.keycloak.issuer | quote }}
  KEYCLOAK_INTERNAL_URL: {{ .Values.keycloak.internalUrl | quote }}
  KEYCLOAK_REALM: {{ .Values.keycloak.realm | quote }}
  KEYCLOAK_CLIENT_ID: {{ .Values.keycloak.clientId | quote }}
  KEYCLOAK_CLIENT_SECRET: {{ .Values.keycloak.clientSecret | quote }}

  # Airflow
  INTERNAL_AIRFLOW_API: {{ .Values.services.airflow.apiUrl | quote }}
  PUBLIC_AIRFLOW_URL: {{ .Values.services.airflow.publicUrl | quote }}

  # Trino
  INTERNAL_TRINO_URL: {{ .Values.services.trino.url | quote }}

  # Nessie
  INTERNAL_NESSIE_API: {{ .Values.services.nessie.apiUrl | quote }}

  # MinIO
  INTERNAL_MINIO_ENDPOINT: {{ .Values.services.minio.endpoint | quote }}
  INTERNAL_MINIO_ACCESS_KEY: {{ .Values.services.minio.accessKey | quote }}
  INTERNAL_MINIO_SECRET_KEY: {{ .Values.services.minio.secretKey | quote }}
  NEXT_PUBLIC_MINIO_URL: {{ .Values.services.minio.publicUrl | quote }}

  # OpenMetadata
  INTERNAL_OPENMETADATA: {{ .Values.services.openmetadata.apiUrl | quote }}
  PUBLIC_OPENMETADATA_URL: {{ .Values.services.openmetadata.publicUrl | quote }}

  # JupyterHub
  INTERNAL_JUPYTERHUB: {{ .Values.services.jupyterhub.apiUrl | quote }}
  PUBLIC_JUPYTERHUB_URL: {{ .Values.services.jupyterhub.publicUrl | quote }}

  # Grafana
  INTERNAL_GRAFANA: {{ .Values.services.grafana.internalUrl | quote }}
  NEXT_PUBLIC_GRAFANA_URL: {{ .Values.services.grafana.publicUrl | quote }}
  GRAFANA_ADMIN_PASSWORD: {{ .Values.services.grafana.adminPassword | quote }}

  # StarRocks
  STARROCKS_HOST: {{ .Values.services.starrocks.host | quote }}
  STARROCKS_PORT: {{ .Values.services.starrocks.port | quote }}
  STARROCKS_USER: {{ .Values.services.starrocks.user | quote }}
  STARROCKS_PASSWORD: {{ .Values.services.starrocks.password | quote }}

  # Kafka (optional)
  KAFKA_BROKER: {{ .Values.services.kafka.broker | quote }}

  # App
  NEXT_PUBLIC_APP_NAME: "VNPT Data Lighthouse"
```

### Bước 3: Xóa hardcode trong `src/lib/services/starrocks.ts`

Tìm đoạn fallback hardcode và xóa hoàn toàn:

```typescript
// SAI — xóa bỏ
const connection = await mysql.createConnection({
  host: process.env.STARROCKS_HOST || '10.167.70.13',  // ← xóa fallback
  port: parseInt(process.env.STARROCKS_PORT || '30030'),
  user: process.env.STARROCKS_USER || 'root',           // ← xóa fallback
  password: process.env.STARROCKS_PASSWORD || '',        // ← xóa fallback
})

// ĐÚNG — fail fast nếu thiếu config
const host = process.env.STARROCKS_HOST
const port = process.env.STARROCKS_PORT
const user = process.env.STARROCKS_USER
if (!host || !port || !user) {
  throw new Error('StarRocks chưa được cấu hình. Kiểm tra biến môi trường STARROCKS_HOST/PORT/USER.')
}
const connection = await mysql.createConnection({
  host,
  port: parseInt(port),
  user,
  password: process.env.STARROCKS_PASSWORD ?? '',
})
```

### Bước 4: Đổi `NEXTAUTH_SECRET` → `AUTH_SECRET` trong `.env.example`

```bash
# Tìm và thay thế trong .env.example
sed -i 's/NEXTAUTH_SECRET=/AUTH_SECRET=/g' .env.example
```

Và thêm ghi chú hướng dẫn generate:
```
# Generate bằng: openssl rand -base64 32
AUTH_SECRET=
```

### Bước 5: Đổi tên biến STARROCKS nhất quán

Tìm tất cả nơi dùng `STARROCKS_NODE_PORT_HOST` hoặc `STARROCKS_FE_HOST` (biến cũ từ AGENTS.md):
```bash
grep -r "STARROCKS" src/ --include="*.ts" --include="*.tsx"
```
Thay thành `STARROCKS_HOST` cho nhất quán.

### Bước 6: Verify bằng helm template

```bash
# Kiểm tra render Secret (dùng placeholder values)
helm template data-lighthouse ./helm \
  --set keycloak.clientSecret=test \
  --set nextauth.secret=test \
  --set services.minio.secretKey=test \
  | grep -A 5 "kind: Secret"
```
Kết quả phải hiển thị đủ ~30 biến trong Secret.

```bash
# Verify không còn hardcode
grep -rn "10.167.70\|minioadmin\|123123123\|GrafanaAdminPass\|admin:admin" src/ \
  --include="*.ts" --include="*.tsx" | grep -v ".env.example" | grep -v "// "
# Kết quả mong đợi: không có dòng nào
```

## Kiểm tra hoàn thành
- [x] `helm template` render đủ ~30 biến trong Secret, không có trường rỗng với giá trị thiếu
- [x] `values.yaml` có đủ tất cả blocks (keycloak, nextauth, services.*)
- [x] `starrocks.ts` không còn fallback hardcode — throw Error nếu thiếu env
- [x] `.env.example` dùng `AUTH_SECRET` (không phải `NEXTAUTH_SECRET`)
- [x] Biến STARROCKS nhất quán một tên duy nhất: `STARROCKS_HOST`
- [x] `grep hardcode` trả về không có kết quả
- [x] `pnpm build` không lỗi

## Trạng thái
**Hoàn thành:** 2026-06-28
**P0 fixes liên quan:** P0-T1 (Helm Secret credentials)
**Ghi chú:** Đã hoàn thành toàn bộ checklist theo chuẩn production.
