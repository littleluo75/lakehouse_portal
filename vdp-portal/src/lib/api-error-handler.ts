import { ServiceError } from '@/lib/internal-client'

export function handleApiError(error: unknown): Response {
  console.error('[BFF Error]', error)

  if (error instanceof ServiceError) {
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
