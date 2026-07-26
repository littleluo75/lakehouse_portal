/**
 * ProductApi — the single client boundary between the portal UI and the
 * Product Control Plane. Every product screen (workspaces, connections,
 * access requests, pipelines, datasets, catalog, query, operations, audit)
 * must go through this client, never call `/api/<tool>` legacy routes or
 * infrastructure endpoints directly.
 *
 *   Portal UI -> ProductApi -> /api/cp/v1 -> BA Draft mock handlers
 *
 * In BA Draft mode, /api/cp/v1 is served entirely by mock Route Handlers
 * (see src/app/api/cp/v1). When real Product Control Plane APIs are ready,
 * only the server-side implementation behind this same path changes — this
 * client and every caller of it stay the same.
 */

const BASE_PATH = '/api/cp/v1'

export class ProductApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ProductApiError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!path.startsWith('/')) {
    throw new ProductApiError(400, `ProductApi path must be relative to ${BASE_PATH}, got "${path}"`)
  }
  const response = await fetch(`${BASE_PATH}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    credentials: 'same-origin',
  })

  const contentType = response.headers.get('content-type')
  const payload = contentType?.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'object' && payload && 'error' in payload ? String(payload.error) : response.statusText
    const code = typeof payload === 'object' && payload && 'code' in payload ? String(payload.code) : undefined
    throw new ProductApiError(response.status, message, code)
  }

  return payload as T
}

export const productApi = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>(path, { method: 'POST', body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>(path, { method: 'PUT', body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>(path, { method: 'PATCH', body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'DELETE', signal }),
}
