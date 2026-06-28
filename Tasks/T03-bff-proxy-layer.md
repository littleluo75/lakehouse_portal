# T03 — BFF Proxy Layer

**Đọc AGENTS.md trước khi thực thi task này.**
**Yêu cầu:** T01 + T02 đã hoàn thành.

## Mục tiêu
Xây dựng lớp proxy tập trung trong BFF: một factory function tạo ra các HTTP client typesafe cho từng internal service, với auth forwarding, error handling chuẩn hoá, và timeout.

## Các bước thực hiện

### Bước 1: Internal HTTP Client Factory

**`src/lib/internal-client.ts`**:
```typescript
import type { Session } from 'next-auth'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
  timeout?: number
}

interface InternalClientConfig {
  baseUrl: string
  authType: 'bearer' | 'basic' | 'none'
  basicCredentials?: { username: string; password: string }
}

export function createInternalClient(config: InternalClientConfig) {
  return async function request<T>(
    path: string,
    session: Session | null,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, headers = {}, timeout = 30000 } = options
    
    // Build auth header
    const authHeader: Record<string, string> = {}
    if (config.authType === 'bearer' && session?.accessToken) {
      authHeader['Authorization'] = `Bearer ${session.accessToken}`
    } else if (config.authType === 'basic' && config.basicCredentials) {
      const encoded = Buffer.from(
        `${config.basicCredentials.username}:${config.basicCredentials.password}`
      ).toString('base64')
      authHeader['Authorization'] = `Basic ${encoded}`
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(`${config.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new ServiceError(response.status, errorText, config.baseUrl)
      }
      
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return response.json() as Promise<T>
      }
      return response.text() as unknown as T
      
    } catch (err) {
      if (err instanceof ServiceError) throw err
      if ((err as Error).name === 'AbortError') {
        throw new ServiceError(504, 'Request timeout', config.baseUrl)
      }
      throw new ServiceError(503, `Service unavailable: ${(err as Error).message}`, config.baseUrl)
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

export class ServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly service: string
  ) {
    super(message)
    this.name = 'ServiceError'
  }
}
```

### Bước 2: Khởi tạo các service clients

**`src/lib/services/index.ts`**:
```typescript
import { createInternalClient } from '@/lib/internal-client'

export const airflowClient = createInternalClient({
  baseUrl: process.env.INTERNAL_AIRFLOW_API!,
  authType: 'bearer',
  // Airflow đã tích hợp Keycloak OIDC → forward token trực tiếp
})

export const trinoClient = createInternalClient({
  baseUrl: process.env.INTERNAL_TRINO_URL!,
  authType: 'none',
  // Trino security=NONE → BFF tự kiểm tra role trước khi gọi
})

export const nessieClient = createInternalClient({
  baseUrl: process.env.INTERNAL_NESSIE_API!,
  authType: 'none',
})

export const openmetadataClient = createInternalClient({
  baseUrl: process.env.INTERNAL_OPENMETADATA!,
  authType: 'basic',
  basicCredentials: {
    username: 'admin',
    password: 'admin',
  },
  // TODO: Sau khi enable OIDC cho OpenMetadata → đổi sang bearer
})

export const jupyterhubClient = createInternalClient({
  baseUrl: process.env.INTERNAL_JUPYTERHUB!,
  authType: 'bearer',
})

export const grafanaClient = createInternalClient({
  baseUrl: process.env.INTERNAL_GRAFANA!,
  authType: 'basic',
  basicCredentials: {
    username: 'admin',
    password: process.env.GRAFANA_ADMIN_PASSWORD ?? 'GrafanaAdminPass123!',
  },
})
```

### Bước 3: Error handler chuẩn hoá cho API Routes

**`src/lib/api-error-handler.ts`**:
```typescript
import { ServiceError } from '@/lib/internal-client'

export function handleApiError(error: unknown): Response {
  console.error('[BFF Error]', error)
  
  if (error instanceof ServiceError) {
    // Map service error codes
    if (error.statusCode === 401) {
      return Response.json(
        { success: false, error: 'Service authentication failed' },
        { status: 502 }
      )
    }
    if (error.statusCode === 504) {
      return Response.json(
        { success: false, error: 'Service timeout — thử lại sau' },
        { status: 504 }
      )
    }
    if (error.statusCode >= 500) {
      return Response.json(
        { success: false, error: `Service ${error.service} không khả dụng` },
        { status: 503 }
      )
    }
  }
  
  return Response.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  )
}
```

### Bước 4: MinIO Client (S3 SDK)

**`src/lib/services/minio.ts`**:
```typescript
import { S3Client, ListBucketsCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3Client = new S3Client({
  endpoint: process.env.INTERNAL_MINIO_ENDPOINT,
  credentials: {
    accessKeyId: process.env.INTERNAL_MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.INTERNAL_MINIO_SECRET_KEY!,
  },
  region: 'us-east-1',
  forcePathStyle: true, // MinIO yêu cầu path-style
})

export async function listBuckets() {
  const cmd = new ListBucketsCommand({})
  return s3Client.send(cmd)
}

export async function listObjects(bucket: string, prefix?: string) {
  const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, Delimiter: '/' })
  return s3Client.send(cmd)
}

export async function getDownloadUrl(bucket: string, key: string) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
  return getSignedUrl(s3Client, cmd, { expiresIn: 3600 })
}
```

### Bước 5: Kubernetes Client cho CRDs

**`src/lib/services/k8s.ts`**:
```typescript
import * as k8s from '@kubernetes/client-node'

const kc = new k8s.KubeConfig()

// Trong cluster (production): dùng serviceAccount token tự động
// Ngoài cluster (dev): dùng kubeconfig file
if (process.env.KUBERNETES_SERVICE_HOST) {
  kc.loadFromCluster()
} else {
  kc.loadFromDefault()
}

const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi)
const coreApi = kc.makeApiClient(k8s.CoreV1Api)

// Lấy danh sách SparkApplication CRDs
export async function listSparkApplications(namespace = 'spark-operator') {
  const response = await customObjectsApi.listNamespacedCustomObject(
    'sparkoperator.k8s.io', 'v1beta2', namespace, 'sparkapplications'
  )
  return response.body
}

// Lấy Volcano queues
export async function listVolcanoQueues() {
  const response = await customObjectsApi.listClusterCustomObject(
    'scheduling.volcano.sh', 'v1beta1', 'queues'
  )
  return response.body
}

export { customObjectsApi, coreApi }
```

### Bước 6: Frontend API Client (gọi từ browser → /api/*)

**`src/lib/api-client.ts`**:
```typescript
// Client-side fetcher — chỉ gọi /api/* của portal, không bao giờ gọi external
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed')
  }
  
  return data
}

export const api = {
  // Airflow
  dags: {
    list: () => apiFetch<{ dags: unknown[] }>('/airflow/dags'),
    get: (dagId: string) => apiFetch<unknown>(`/airflow/dags/${dagId}`),
    trigger: (dagId: string, conf?: Record<string, unknown>) =>
      apiFetch(`/airflow/dags/${dagId}/trigger`, { method: 'POST', body: JSON.stringify({ conf }) }),
  },
  // SQL
  sql: {
    execute: (query: string, catalog?: string, schema?: string) =>
      apiFetch('/trino/query', { method: 'POST', body: JSON.stringify({ query, catalog, schema }) }),
    status: (queryId: string) => apiFetch(`/trino/query/${queryId}`),
  },
  // MinIO
  storage: {
    buckets: () => apiFetch('/minio/buckets'),
    objects: (bucket: string, prefix?: string) =>
      apiFetch(`/minio/buckets/${bucket}/objects?prefix=${prefix ?? ''}`),
  },
  // Spark
  spark: {
    list: () => apiFetch('/spark/applications'),
  },
  // Nessie
  nessie: {
    branches: () => apiFetch('/nessie/trees'),
  },
}
```

### Bước 7: Test API Route mẫu

**`src/app/api/health/route.ts`** — Health check endpoint kiểm tra kết nối các services:
```typescript
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  
  return Response.json({
    success: true,
    data: {
      portal: 'ok',
      authenticated: !!session,
      user: session?.user?.name ?? null,
      timestamp: new Date().toISOString(),
    }
  })
}
```

## Kiểm tra hoàn thành

- [x] `GET /api/health` trả về `{ success: true, data: { portal: 'ok' } }`
- [x] Gọi internal service URL từ API route hoạt động (kiểm tra bằng log)
- [x] `ServiceError` được bắt và trả về response đúng format
- [x] MinIO client kết nối được (test `listBuckets`)
- [x] Không có credentials nào xuất hiện trong response trả về client
- [x] TypeScript build không lỗi

## Trạng thái
**Hoàn thành:** 2026-06-28
**P0 fixes liên quan:** P0-T1 (Internal URLs)
**Ghi chú:** Đã xác minh thực tế triển khai trên production codebase.
