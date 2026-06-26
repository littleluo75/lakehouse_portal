# T10 — Module Observability (Grafana Embed + Health)

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01, T02, T03 đã hoàn thành.
**Yêu cầu infra:** PR-3 (Grafana `allow_embedding: true` + `cookie_samesite: none`) đã merge vào `lakehouse_infra`.

## Mục tiêu
Trang `/observability` — xem metrics sức khỏe platform qua Grafana panels nhúng.

## Roles được phép
`Op`, `Admin`, `SuperAdmin`, `PM`

## Bước 0 — Lấy Grafana Dashboard IDs (PHẢI làm trước khi code UI)

BFF gọi Grafana API để lấy danh sách dashboards:
```
GET http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80/api/search?type=dash-db
Headers: Authorization: Basic {base64(admin:GrafanaAdminPass123!)}
```

Từ kết quả, tìm dashboard "Lakehouse Observability Portal" → lấy `uid`.
Sau đó:
```
GET /api/dashboards/uid/{uid}
```
→ Extract panel IDs cần nhúng. Lưu vào `src/config/grafana.ts`.

**`src/config/grafana.ts`** (điền sau khi có data thực):
```typescript
export const GRAFANA_CONFIG = {
  baseUrl: process.env.PUBLIC_GRAFANA_URL!, // https://grafana.lakehouse.local
  dashboards: {
    lakehouse: {
      uid: 'FILL_FROM_API',   // ← điền sau khi query API
      panels: {
        cpuUsage: 0,          // ← điền panel ID thực
        memoryUsage: 0,
        sparkJobs: 0,
        airflowHealth: 0,
        storageUsage: 0,
        networkIO: 0,
      }
    }
  }
}
```

## BFF API Routes
```
GET /api/observability/dashboards     → list dashboards từ Grafana
GET /api/observability/panels?uid=    → panels của dashboard theo uid
GET /api/observability/health         → health check tất cả services
```

### Health check implementation
```typescript
// /api/observability/health/route.ts
const SERVICES = [
  { name: 'Airflow', url: process.env.INTERNAL_AIRFLOW_API + '/health' },
  { name: 'Trino', url: process.env.INTERNAL_TRINO_URL + '/v1/info' },
  { name: 'OpenMetadata', url: process.env.INTERNAL_OPENMETADATA + '/system/status' },
  { name: 'MinIO', url: process.env.INTERNAL_MINIO_ENDPOINT + '/minio/health/live' },
  { name: 'JupyterHub', url: process.env.INTERNAL_JUPYTERHUB + '/../hub/health' },
  { name: 'Nessie', url: process.env.INTERNAL_NESSIE_API + '/../q/health' },
]

// Dùng Promise.allSettled với timeout 5s mỗi service
// Return: [{ name, status: 'healthy'|'degraded'|'down', latencyMs }]
```

## UI Components

### GrafanaPanel component
```typescript
// src/components/modules/grafana-panel.tsx
'use client'
interface GrafanaPanelProps {
  dashboardUid: string
  panelId: number
  title: string
  height?: number
  timeRange?: 'now-1h' | 'now-3h' | 'now-24h' | 'now-7d'
}

export function GrafanaPanel({ dashboardUid, panelId, title, height = 300, timeRange = 'now-3h' }: GrafanaPanelProps) {
  const [iframeError, setIframeError] = useState(false)
  const src = `${process.env.NEXT_PUBLIC_GRAFANA_URL}/d-solo/${dashboardUid}?` +
    `orgId=1&from=${timeRange}&to=now&panelId=${panelId}&theme=light&kiosk`

  if (iframeError) {
    return (
      <div className="flex items-center justify-center h-full border rounded-lg bg-muted">
        <a href={process.env.NEXT_PUBLIC_GRAFANA_URL} target="_blank" className="text-blue-500 underline">
          Mở {title} trong Grafana
        </a>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b bg-muted/50 text-sm font-medium">{title}</div>
      <iframe
        src={src}
        width="100%"
        height={height}
        frameBorder="0"
        onError={() => setIframeError(true)}
      />
    </div>
  )
}
```

### Trang `/observability`

**Header:**
- Tiêu đề "Observability"
- Time range selector: `1h | 3h | 24h | 7d` (cập nhật tất cả panels)

**Platform Health Row (dòng đầu):**
6 status cards ngang hàng, poll mỗi 60 giây:
```
[Airflow ✅] [Trino ✅] [OpenMetadata ✅] [MinIO ✅] [JupyterHub ⚠️] [Nessie ✅]
```
- ✅ healthy (green dot)
- ⚠️ degraded / latency cao (yellow dot)
- ❌ down (red dot)
- Hiển thị latency: "42ms"

**Panels Grid (2 cột, 3 hàng = 6 panels):**
- CPU Usage | Memory Usage
- Spark Jobs Status | Airflow DAG Health
- MinIO Storage | Network I/O

**Fallback toàn trang nếu Grafana không embed được:**
Banner thông báo + nút "Mở Grafana Dashboard" link sang `https://grafana.lakehouse.local`

## Kiểm tra hoàn thành
- [ ] Grafana panel IDs được lấy từ API thực (không hardcode ngẫu nhiên)
- [ ] Health check trả về status thực của 6 services
- [ ] Panels grid hiển thị (iframe load được sau khi PR-3 merge)
- [ ] Time range selector cập nhật tất cả panels
- [ ] Fallback hiển thị nếu iframe bị block
- [ ] Health status tự refresh mỗi 60 giây
- [ ] `pnpm build` không lỗi
