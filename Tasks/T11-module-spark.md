# T11 — Module Spark Jobs

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01, T02, T03 đã hoàn thành. (T03 đã setup K8s client)

## Mục tiêu
Trang `/jobs` — xem danh sách Spark jobs từ K8s SparkApplication CRDs.

## Roles được phép
`DE`, `Op`, `Admin`, `SuperAdmin`

## Kubernetes CRD
```
Group:     sparkoperator.k8s.io
Version:   v1beta2
Resource:  sparkapplications
Namespace: spark-operator
```

## TypeScript types — `src/types/spark.ts`
```typescript
export type SparkAppState = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SUBMITTED' | 'PENDING' | 'UNKNOWN'

export interface SparkApplication {
  metadata: {
    name: string
    namespace: string
    creationTimestamp: string
    labels?: Record<string, string>
  }
  spec: {
    type: 'Scala' | 'Java' | 'Python' | 'R'
    mainClass?: string
    mainApplicationFile: string
    sparkVersion?: string
  }
  status?: {
    applicationState: {
      state: SparkAppState
      errorMessage?: string
    }
    sparkWebUI?: {
      ingressURL?: string
    }
    driverInfo?: {
      podName?: string
      webUIAddress?: string
    }
    lastSubmissionAttemptTime?: string
    terminationTime?: string
  }
}
```

## BFF API Routes

```
GET /api/spark/applications
  Query params: ?namespace=spark-operator&state=RUNNING (optional filter)
  Response: { items: SparkApplication[], total: number }

GET /api/spark/applications/[name]
  Query params: ?namespace=spark-operator
  Response: SparkApplication

GET /api/spark/applications/[name]/logs
  Query params: ?namespace=spark-operator&lines=100
  Response: { logs: string }
  (Đọc logs từ driver pod qua K8s CoreV1Api.readNamespacedPodLog)
```

### Implementation BFF
```typescript
// src/app/api/spark/applications/route.ts
import { listSparkApplications } from '@/lib/services/k8s'
import { validateApiAuth } from '@/lib/api-auth'

export async function GET(request: Request) {
  const { session, error } = await validateApiAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])
  if (error) return error

  const items = await listSparkApplications()
  // Cast và extract fields cần thiết
  return Response.json({ success: true, data: { items, total: items.length } })
}
```

### K8s ServiceAccount (cần tạo trong Helm chart)
Portal pod cần ServiceAccount với quyền đọc SparkApplication CRDs:
```yaml
# helm/templates/rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: vdp-portal-reader
rules:
  - apiGroups: ["sparkoperator.k8s.io"]
    resources: ["sparkapplications"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["scheduling.volcano.sh"]
    resources: ["queues", "jobs"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: vdp-portal-reader
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: vdp-portal-reader
subjects:
  - kind: ServiceAccount
    name: vdp-portal
    namespace: vdp-portal
```

Thêm vào `helm/templates/serviceaccount.yaml` và `helm/templates/deployment.yaml`:
```yaml
serviceAccountName: vdp-portal
```

## UI Components

### Summary Cards (đầu trang)
Đếm từ danh sách: Running | Completed | Failed | Submitted/Pending

### Jobs Table
Cột: Tên job | Type (Scala/Python) | Trạng thái | Bắt đầu | Duration | Spark UI

**Duration:** tính từ `lastSubmissionAttemptTime` đến `terminationTime` (hoặc hiện tại nếu đang chạy)

**Spark UI link:**
- Nếu có `status.sparkWebUI.ingressURL` → link trực tiếp
- Fallback: `https://{name}-spark-operator.spark-ui.lakehouse.local`

**Filter:** Dropdown trạng thái (All / Running / Completed / Failed)

### Job Detail Drawer (click tên job)
- Spec: type, mainClass, mainApplicationFile, sparkVersion
- State + errorMessage (nếu FAILED)
- Driver pod name
- Link Spark UI
- **Logs Tab:** Textarea read-only hiển thị 100 dòng log cuối từ driver pod
  - Nút "Refresh logs"
  - Monospace font, dark background

## Kiểm tra hoàn thành
- [x] Danh sách SparkApplications từ K8s CRD thực
- [x] Filter theo state hoạt động
- [x] Duration tính đúng
- [x] Spark UI link đúng format
- [x] Logs từ driver pod hiển thị (cần ServiceAccount đúng quyền)
- [x] RBAC trong Helm chart có ClusterRole + ClusterRoleBinding
- [x] `pnpm build` không lỗi
