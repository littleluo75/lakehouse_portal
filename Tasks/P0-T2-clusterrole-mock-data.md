# P0-T2 — ClusterRole thiếu quyền nodes + Xóa mock data giả

**Đọc AGENTS.md trước khi thực thi.**
**Nguồn:** Opus 4.8 Critical #2

## Vấn đề
`helm/templates/rbac.yaml` thiếu quyền `nodes` → `coreApi.listNode()` luôn trả về 403
→ dashboard `summary/route.ts` rơi vào `catch` và trả về **số liệu hardcode giả**:
```typescript
// Đang xảy ra trong production:
nodeCount: 3,
totalCores: '46 cores',
totalMemory: '320 GB'
```
PM/lãnh đạo nhìn Dashboard thấy "3 nodes / 46 cores / 320 GB" tưởng là dữ liệu thực.

## Các bước thực hiện

### Bước 1: Thêm quyền `nodes` vào `helm/templates/rbac.yaml`

Tìm block `rules:` trong ClusterRole, thêm entry:

```yaml
rules:
  # --- đã có ---
  - apiGroups: ["sparkoperator.k8s.io"]
    resources: ["sparkapplications"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["scheduling.volcano.sh"]
    resources: ["queues", "jobs"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  # --- THÊM MỚI ---
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list"]
```

### Bước 2: Xóa mock data giả trong `src/app/api/dashboard/summary/route.ts`

Tìm đoạn catch của `listNode()` — hiện đang trả về số giả:

```typescript
// SAI — xóa toàn bộ block mock này
} catch {
  return {
    connected: false,
    nodeCount: 3,          // ← GIẢ
    totalCores: '46 cores', // ← GIẢ
    totalMemory: '320 GB',  // ← GIẢ
  }
}
```

Thay bằng:

```typescript
} catch (err) {
  console.error('[Dashboard] Không thể lấy thông tin nodes K8s:', err)
  return {
    connected: false,
    nodeCount: null,
    totalCores: null,
    totalMemory: null,
  }
}
```

### Bước 3: Cập nhật TypeScript type cho cluster stats

Tìm type định nghĩa cluster stats (có thể trong `src/types/index.ts` hoặc inline):

```typescript
// Trước
interface ClusterStats {
  connected: boolean
  nodeCount: number      // ← không phản ánh khả năng null
  totalCores: string
  totalMemory: string
}

// Sau
interface ClusterStats {
  connected: boolean
  nodeCount: number | null    // null = không lấy được, KHÔNG phải 0
  totalCores: string | null
  totalMemory: string | null
}
```

### Bước 4: Cập nhật UI hiển thị khi null

Tìm component hiển thị cluster stats trong dashboard (thường ở `src/app/(dashboard)/page.tsx`
hoặc `src/components/modules/`):

```typescript
// Trước — hiển thị số giả
<span>{clusterStats.nodeCount} nodes</span>

// Sau — hiển thị rõ ràng khi không có dữ liệu
<span>
  {clusterStats.nodeCount !== null
    ? `${clusterStats.nodeCount} nodes`
    : 'Không khả dụng'}
</span>
```

Áp dụng tương tự cho `totalCores` và `totalMemory`.

**Không dùng badge "Mock Mode"** — xóa nó nếu đang có, thay bằng text "Không khả dụng" thẳng trong cell.

### Bước 5: Verify

```bash
# Kiểm tra không còn mock numbers hardcode
grep -n "46 cores\|320 GB\|nodeCount: 3\|Mock Mode\|mock" \
  src/app/api/dashboard/summary/route.ts \
  src/app/\(dashboard\)/page.tsx 2>/dev/null
# Kết quả mong đợi: không có dòng nào

# Kiểm tra ClusterRole có nodes
grep -A 3 "nodes" helm/templates/rbac.yaml
# Kết quả mong đợi: có entry resources: ["nodes"] với verbs get/list
```

## Kiểm tra hoàn thành
- [x] `rbac.yaml` ClusterRole có rule `nodes` với verbs `get`, `list`
- [x] `summary/route.ts` không còn số hardcode (46 cores, 320 GB, nodeCount: 3)
- [x] Khi `listNode()` fail: trả `null`, không trả số giả
- [x] UI hiển thị "Không khả dụng" thay vì số giả khi `null`
- [x] Xóa badge "Mock Mode" nếu có
- [x] TypeScript type dùng `number | null` và `string | null`
- [x] `pnpm build` không lỗi

## Trạng thái
**Hoàn thành:** 2026-06-28
**P0 fixes liên quan:** P0-T2 (ClusterRole & mock data)
**Ghi chú:** Đã hoàn thành toàn bộ checklist theo chuẩn production.
