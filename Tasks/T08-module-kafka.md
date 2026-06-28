# T08 — Module Kafka Monitor (Streams)

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01, T02, T03 đã hoàn thành.

## Mục tiêu
Trang `/streams` — monitor Kafka topics và consumer groups.

## Roles được phép
`DE`, `Op`, `Admin`, `SuperAdmin`

## Bước 0 — Xác định Kafka endpoint từ repo infra (PHẢI làm trước)

Tìm trong `lakehouse_infra` repo:
```bash
grep -r "kafka" rke2/ --include="*.yaml" -l
grep -r "strimzi" rke2/ --include="*.yaml" -l
grep -r "kafka-ui" rke2/ --include="*.yaml" -l
```

**Có 3 kịch bản, implement theo kịch bản thực tế:**

### Kịch bản A: Kafka UI (Provectus) đã deploy
Dùng Kafka UI REST API:
- `GET /api/clusters` → list clusters
- `GET /api/clusters/{cluster}/topics` → list topics
- `GET /api/clusters/{cluster}/consumer-groups` → list consumer groups
- `GET /api/clusters/{cluster}/consumer-groups/{group}` → group detail với lag

BFF chỉ cần proxy tới `http://kafka-ui.{namespace}.svc.cluster.local:{port}/api/...`

### Kịch bản B: Kafka broker trực tiếp (Strimzi hoặc bare Kafka)
```bash
pnpm add kafkajs
```

Tìm broker address trong Strimzi CR hoặc Kafka StatefulSet:
```typescript
// src/lib/services/kafka.ts
import { Kafka } from 'kafkajs'

const kafka = new Kafka({
  clientId: 'vdp-portal',
  brokers: [process.env.KAFKA_BROKER!], // e.g. 'kafka.kafka.svc.cluster.local:9092'
})

export async function listTopics() {
  const admin = kafka.admin()
  await admin.connect()
  const topics = await admin.listTopics()
  const metadata = await admin.fetchTopicMetadata({ topics })
  await admin.disconnect()
  return metadata.topics
}

export async function listConsumerGroups() {
  const admin = kafka.admin()
  await admin.connect()
  const groups = await admin.listGroups()
  await admin.disconnect()
  return groups.groups
}
```

### Kịch bản C: Kafka chưa deploy
Tạo trang placeholder:
```typescript
// src/app/(dashboard)/streams/page.tsx
export default function StreamsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-muted-foreground" />
      <h2>Module Kafka chưa được cấu hình</h2>
      <p className="text-muted-foreground text-center">
        Kafka broker endpoint chưa được xác định trong hệ thống.<br/>
        Vui lòng liên hệ Admin để cấu hình.
      </p>
    </div>
  )
}
```

## BFF API Routes (Kịch bản A hoặc B)
```
GET /api/kafka/topics
GET /api/kafka/topics/[name]
GET /api/kafka/consumer-groups
GET /api/kafka/consumer-groups/[id]
```

Thêm vào `.env.example`:
```
KAFKA_BROKER=kafka.kafka.svc.cluster.local:9092
# hoặc nếu dùng Kafka UI:
KAFKA_UI_URL=http://kafka-ui.kafka.svc.cluster.local:8080
```

## UI Components (Kịch bản A hoặc B)

### Topics Table
Cột: Tên topic | Partitions | Replication factor | Messages/sec* | Actions
(*nếu có từ Prometheus, nếu không thì ẩn cột)

Click topic → Topic Detail

### Topic Detail (drawer hoặc trang con)
- Thông tin cơ bản: partitions, replication
- Partitions table: ID | Leader | Replicas | Start offset | End offset | Messages count

### Consumer Groups Table
Cột: Group ID | Trạng thái | Topics | Total Lag
- Lag color-coded: green (<1K) | yellow (<10K) | red (>10K)
- Click group → xem lag per partition

## Kiểm tra hoàn thành
- [x] Xác định được kịch bản (A/B/C) từ repo infra — ghi vào comment đầu file
- [x] Kịch bản A/B: Topics table hiển thị dữ liệu thực
- [x] Kịch bản A/B: Consumer groups + lag hiển thị
- [x] Kịch bản C: Placeholder page render không lỗi
- [x] `pnpm build` không lỗi — build thành công 29/29 pages (2026-06-28)

## Trạng thái
**Hoàn thành:** 2026-06-28
**P0 fixes liên quan:** Không có
**Ghi chú:** Đã xác minh thực tế triển khai trên production codebase.
