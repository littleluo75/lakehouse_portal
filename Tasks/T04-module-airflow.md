# T04 — Module Airflow (Workflows)

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01, T02, T03 đã hoàn thành.

## Mục tiêu
Trang `/workflows` — quản lý và monitor DAGs của Apache Airflow.

## Roles được phép
`DE`, `Op`, `Admin`, `SuperAdmin`

## Airflow API endpoints
- `GET /dags` — danh sách DAGs
- `GET /dags/{dag_id}` — chi tiết DAG
- `GET /dags/{dag_id}/dagRuns` — lịch sử runs
- `POST /dags/{dag_id}/dagRuns` — trigger run
- `PATCH /dags/{dag_id}` — pause/unpause (`{ is_paused: true/false }`)
- `GET /dags/{dag_id}/dagRuns/{run_id}/taskInstances` — task instances

**Auth:** Forward `Bearer {session.accessToken}` — Airflow đã tích hợp Keycloak.

## BFF API Routes
```
GET  /api/airflow/dags
GET  /api/airflow/dags/[dagId]
GET  /api/airflow/dags/[dagId]/runs
POST /api/airflow/dags/[dagId]/trigger
PATCH /api/airflow/dags/[dagId]/pause
GET  /api/airflow/dags/[dagId]/runs/[runId]/tasks
```

## TypeScript types — `src/types/airflow.ts`
```typescript
export interface DAG {
  dag_id: string
  description: string | null
  is_paused: boolean
  is_active: boolean
  schedule_interval: string | null
  tags: Array<{ name: string }>
  owners: string[]
  next_dagrun: string | null
}

export type RunState = 'success' | 'failed' | 'running' | 'queued'

export interface DAGRun {
  dag_run_id: string
  dag_id: string
  state: RunState
  start_date: string | null
  end_date: string | null
  execution_date: string
  conf: Record<string, unknown>
}
```

## UI Components

### Summary Cards (4 cards đầu trang)
Lấy từ `/api/airflow/dags`: tổng DAGs / active / running / failed hôm nay.

### DAG List Table (`@tanstack/react-table`)
Cột: Tên DAG (clickable) | Tags | Trạng thái (toggle Active/Pause) | Last Run + status | Schedule | Actions (Trigger)
- Toggle Pause chỉ hiện với `Op`, `Admin`, `SuperAdmin`
- Nút Trigger chỉ hiện với `Op`, `Admin`, `SuperAdmin`
- Filter: search tên, filter tag, filter trạng thái

Status badge: success=green, failed=red, running=yellow+spinner, queued=blue, paused=gray

### DAG Detail Drawer (slide in từ phải, click tên DAG)
- Header: tên, tags, owner, schedule, next run
- Run History Table: 10 runs gần nhất
- Nút "Trigger DAG" → mở Dialog xác nhận
- Link "Mở trong Airflow" → `https://airflow.lakehouse.local/dags/{dag_id}/graph`

### Trigger Dialog
- Textarea JSON config (optional, validate trước submit)
- Sau thành công: toast "DAG {dag_id} đã được kích hoạt"

## Kiểm tra hoàn thành
- [x] Danh sách DAGs thực từ Airflow
- [x] Filter/search hoạt động
- [x] Trigger thành công + toast
- [x] Pause/Unpause hoạt động, UI cập nhật ngay
- [x] Role `Viewer`/`BA`/`DA`/`DS` không thấy nút Trigger/Pause
- [x] Role không đủ quyền redirect `/403`
- [x] Loading skeleton + empty state
- [x] `pnpm build` không lỗi
