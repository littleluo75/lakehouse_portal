export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  const data = await response.json()

  // Phiên hết hạn (refresh token thất bại) → tự redirect về login
  if (response.status === 401 && data.code === 'SESSION_EXPIRED' && typeof window !== 'undefined') {
    const currentPath = window.location.pathname
    window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}&reason=session_expired`
    throw new Error('Phiên đăng nhập đã hết hạn')
  }

  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed')
  }

  return data
}

export const apiCall = apiFetch

export const api = {
  dags: {
    list: () => apiFetch<{ dags: unknown[] }>('/airflow/dags'),
    get: (dagId: string) => apiFetch<unknown>(`/airflow/dags/${dagId}`),
    trigger: (dagId: string, conf?: Record<string, unknown>) =>
      apiFetch(`/airflow/dags/${dagId}/trigger`, { method: 'POST', body: JSON.stringify({ conf }) }),
  },
  sql: {
    execute: (query: string, catalog?: string, schema?: string) =>
      apiFetch('/trino/query', { method: 'POST', body: JSON.stringify({ query, catalog, schema }) }),
    status: (queryId: string) => apiFetch(`/trino/query/${queryId}`),
  },
  storage: {
    buckets: () => apiFetch('/minio/buckets'),
    objects: (bucket: string, prefix?: string) =>
      apiFetch(`/minio/buckets/${bucket}/objects?prefix=${prefix ?? ''}`),
    download: (bucket: string, key: string) =>
      apiFetch<{ success: boolean; data: { url: string } }>(`/minio/buckets/${bucket}/download?key=${encodeURIComponent(key)}`),
  },
  spark: {
    list: () => apiFetch('/spark/applications'),
  },
  nessie: {
    branches: () => apiFetch('/nessie/trees'),
  },
  admin: {
    users: () => apiFetch<{ success: boolean; data: unknown[] }>('/admin/users'),
    roles: () => apiFetch<{ success: boolean; data: unknown[] }>('/admin/roles'),
    clusterHealth: () => apiFetch<{ success: boolean; data: unknown }>('/admin/cluster/health'),
    auditLogs: () => apiFetch<{ success: boolean; data: unknown[] }>('/admin/audit-logs'),
  },
}
