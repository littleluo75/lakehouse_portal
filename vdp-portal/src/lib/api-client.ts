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
  },
  spark: {
    list: () => apiFetch('/spark/applications'),
  },
  nessie: {
    branches: () => apiFetch('/nessie/trees'),
  },
}
