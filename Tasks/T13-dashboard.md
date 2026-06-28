# T13 — Dashboard & Landing Page

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01–T12 đã hoàn thành (hoặc ít nhất T01, T02, T03, T04, T09, T11).

## Mục tiêu
Trang `/` — Dashboard tổng quan, trang đầu tiên user thấy sau khi đăng nhập.

## Roles được phép
Tất cả roles — nhưng nội dung được filter theo role.

## BFF Aggregate Endpoint

```
GET /api/dashboard/summary
```

Dùng `Promise.allSettled()` — không fail toàn bộ nếu một service down:

```typescript
// src/app/api/dashboard/summary/route.ts
export async function GET() {
  const { session, error } = await validateApiAuth([]) // tất cả roles
  if (error) return error

  const [airflowResult, sparkResult, minioResult, jupyterResult] = await Promise.allSettled([
    // Active DAGs count
    fetch(`${process.env.INTERNAL_AIRFLOW_API}/dags?is_active=true&limit=1`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }
    }).then(r => r.json()).then(d => d.total_entries as number),

    // Running Spark apps
    listSparkApplications().then(apps =>
      (apps as SparkApplication[]).filter(a => a.status?.applicationState.state === 'RUNNING').length
    ),

    // MinIO total size
    getMinioStats(),

    // JupyterHub active servers (chỉ Admin+)
    hasRole(session.user, ['Admin', 'SuperAdmin'])
      ? fetch(`${process.env.INTERNAL_JUPYTERHUB}/users`, {
          headers: { Authorization: `Bearer ${session.accessToken}` }
        }).then(r => r.json()).then((users: unknown[]) =>
          users.filter((u: { server?: unknown }) => u.server).length
        )
      : Promise.resolve(null),
  ])

  // Health checks
  const healthResults = await Promise.allSettled([
    checkServiceHealth('Airflow', process.env.INTERNAL_AIRFLOW_API + '/health'),
    checkServiceHealth('Trino', process.env.INTERNAL_TRINO_URL + '/v1/info'),
    checkServiceHealth('OpenMetadata', process.env.INTERNAL_OPENMETADATA + '/system/status'),
    checkServiceHealth('MinIO', process.env.INTERNAL_MINIO_ENDPOINT + '/minio/health/live'),
    checkServiceHealth('JupyterHub', process.env.INTERNAL_JUPYTERHUB + '/../hub/health'),
    checkServiceHealth('StarRocks', `http://${process.env.STARROCKS_FE_HOST}:8030/api/health`),
  ])

  return Response.json({
    success: true,
    data: {
      stats: {
        activeDags: airflowResult.status === 'fulfilled' ? airflowResult.value : null,
        runningSparkJobs: sparkResult.status === 'fulfilled' ? sparkResult.value : null,
        storageUsed: minioResult.status === 'fulfilled' ? minioResult.value : null,
        activeNotebooks: jupyterResult.status === 'fulfilled' ? jupyterResult.value : null,
      },
      health: healthResults.map((r, i) => ({
        name: ['Airflow','Trino','OpenMetadata','MinIO','JupyterHub','StarRocks'][i],
        status: r.status === 'fulfilled' ? r.value.status : 'down',
        latencyMs: r.status === 'fulfilled' ? r.value.latencyMs : null,
      })),
    }
  })
}
```

## UI Components

### Welcome Header
```
Xin chào, {user.name} 👋
Hôm nay là {ngày tháng năm}      [Badge: DE]
```

### Quick Stats Row (4 cards, load independently)
Mỗi card dùng Suspense/skeleton riêng — card nào load xong hiển thị trước:

| Card | Data source | Hiện với |
|---|---|---|
| DAGs đang active | Airflow | DE, Op, Admin, SuperAdmin |
| Spark Jobs đang chạy | K8s CRD | DE, Op, Admin, SuperAdmin |
| Storage đã dùng | MinIO | DE, DS, Op, Admin, SuperAdmin |
| Notebooks online | JupyterHub | Admin, SuperAdmin |

BA/PM/Viewer thấy placeholder "—" ở những cards không có quyền.

### Platform Health Grid (2 hàng × 3 cột)
```
[● Airflow    12ms] [● Trino    45ms] [● OpenMetadata  89ms]
[● MinIO      8ms]  [● JupyterHub 23ms] [● StarRocks  102ms]
```
- Dot color: green=healthy, yellow=latency>500ms, red=down
- Tooltip: "Last checked: X seconds ago"
- Auto-refresh mỗi 60 giây (useInterval)

### Recent Activity (role-filtered)

**DE / Op / Admin / SuperAdmin:**
```
Hoạt động gần đây
├── Workflows: 5 DAG runs gần nhất (tên DAG, state, thời gian)
└── Spark Jobs: 5 jobs gần nhất (tên, state, thời gian)
```

**DA / DS:**
```
Query gần đây: load từ localStorage key `lighthouse-portal_query_history`
(5 queries gần nhất — snippet + thời gian)
```

**BA / PM / Viewer:**
```
Tổng quan: 1 Grafana panel embed (dashboard summary)
+ Link "Xem báo cáo đầy đủ trong Grafana"
```

### Quick Actions (bottom row, role-filtered)

```typescript
const QUICK_ACTIONS: { label: string; icon: string; href: string; roles: KeycloakRole[] }[] = [
  { label: 'Trigger DAG', icon: 'Play', href: '/workflows', roles: ['Op','Admin','SuperAdmin'] },
  { label: 'Mở SQL Editor', icon: 'Code2', href: '/query', roles: ['DE','DS','DA','Admin','SuperAdmin'] },
  { label: 'Mở Notebook', icon: 'BookOpen', href: '/notebooks', roles: ['DE','DS','Admin','SuperAdmin'] },
  { label: 'Tìm trong Catalog', icon: 'Search', href: '/catalog', roles: ['DE','DS','DA','BA','Admin','SuperAdmin'] },
  { label: 'Xem Storage', icon: 'FolderOpen', href: '/storage', roles: ['DE','DS','Op','Admin','SuperAdmin'] },
  { label: 'Xem Observability', icon: 'BarChart3', href: '/observability', roles: ['Op','Admin','SuperAdmin','PM'] },
]
```

Hiển thị max 4 actions phù hợp với role hiện tại, dạng button cards.

## Kiểm tra hoàn thành
- [x] Stats cards hiển thị data thực (không mock)
- [x] Cards load độc lập — card nào xong hiển thị trước
- [x] Health grid auto-refresh mỗi 60 giây
- [x] Health status phản ánh đúng trạng thái service
- [x] Recent activity đúng với từng role
- [x] Quick actions chỉ hiện actions phù hợp với role
- [x] Layout responsive tại 1280px và 1920px
- [x] Không có layout shift khi data load xong
- [x] `pnpm build` không lỗi
