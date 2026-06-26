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
