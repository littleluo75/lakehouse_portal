# T09 — Module MinIO Storage Browser

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01, T02, T03 đã hoàn thành. (T03 đã setup S3Client)

## Mục tiêu
Trang `/storage` — duyệt file trong MinIO S3, download, xem thống kê.

## Roles được phép
`DE`, `DS`, `Op`, `Admin`, `SuperAdmin`

## MinIO connection (đã có trong T03)
- Endpoint: `http://minio.minio.svc.cluster.local:9000`
- Access Key: `minioadmin` / Secret: `123123123`
- Buckets hiện có: `iceberg-warehouse`, `spark-events`
- Path style: `true` (bắt buộc với MinIO)

## BFF API Routes
```
GET /api/minio/buckets
  Response: [{ name, creationDate, objectCount?, size? }]

GET /api/minio/buckets/[bucket]/objects?prefix=path/to/folder/
  Response: {
    folders: [{ prefix: string, name: string }],
    files: [{ key: string, name: string, size: number, lastModified: string, etag: string }],
    prefix: string
  }

GET /api/minio/buckets/[bucket]/download?key=path/to/file.parquet
  Response: { url: string, expiresIn: 3600 }
  (tạo presigned URL, redirect hoặc trả URL về client)

GET /api/minio/stats
  Response: { totalSize: number, totalObjects: number, byBucket: { name, size, objects }[] }
```

### Implementation mẫu cho list objects
```typescript
import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { s3Client } from '@/lib/services/minio'

export async function listObjects(bucket: string, prefix = '') {
  const cmd = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    Delimiter: '/',  // phân biệt folder và file
    MaxKeys: 200,
  })
  const result = await s3Client.send(cmd)

  const folders = (result.CommonPrefixes ?? []).map(p => ({
    prefix: p.Prefix!,
    name: p.Prefix!.replace(prefix, '').replace('/', ''),
  }))

  const files = (result.Contents ?? [])
    .filter(obj => obj.Key !== prefix) // loại bỏ folder placeholder
    .map(obj => ({
      key: obj.Key!,
      name: obj.Key!.split('/').pop()!,
      size: obj.Size ?? 0,
      lastModified: obj.LastModified?.toISOString() ?? '',
      etag: obj.ETag ?? '',
    }))

  return { folders, files, prefix }
}
```

## UI Components

### Stats Cards (đầu trang)
- Tổng dung lượng đã dùng (format: GB/TB)
- Tổng số objects
- Số buckets

### Bucket List (trang chính `/storage`)
Cards layout, mỗi bucket 1 card:
- Tên bucket (icon bucket)
- Size + object count
- Ngày tạo
- Click → vào bucket browser

### File Browser (`/storage/[bucket]`)

**Breadcrumb navigation:**
`storage / iceberg-warehouse / db=customer / data /`
- Click từng segment → navigate về level đó

**File/Folder table:**
| Icon | Tên | Size | Ngày modified | Actions |
|---|---|---|---|---|
| 📁 | db=customer/ | — | — | — |
| 📄 | part-00000.parquet | 2.3 MB | 2026-06-20 | Download |
| 📄 | .metadata.json | 1.2 KB | 2026-06-20 | Download \| Copy path |

**Icons theo extension:**
- `.parquet` → 📊 (BarChart icon)
- `.json`, `.yaml` → 📋
- `.py`, `.scala` → 💻
- Khác → 📄

**Actions:**
- Download: gọi `/api/minio/buckets/[bucket]/download?key=...` → nhận presigned URL → `window.open(url)`
- Copy path: copy `s3a://{bucket}/{key}` vào clipboard + toast "Đã copy path"

**Empty folder state:** "Thư mục này trống"

## Kiểm tra hoàn thành
- [ ] List buckets `iceberg-warehouse` và `spark-events`
- [ ] Browse folder hierarchy (navigate vào/ra folder)
- [ ] Breadcrumb navigate đúng
- [ ] File size hiển thị đúng (dùng `formatBytes` từ `src/lib/utils.ts`)
- [ ] Download tạo presigned URL và mở được
- [ ] Copy path hoạt động, toast hiển thị
- [ ] Stats cards hiển thị số liệu thực
- [ ] `pnpm build` không lỗi
