import { type NextRequest } from 'next/server'
import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import type { OmSearchResponse } from '@/types/openmetadata'

const omClient = createInternalClient({
  baseUrl: process.env.INTERNAL_OPENMETADATA ?? '',
  authType: 'basic',
  basicCredentials: { username: 'admin', password: 'admin' },
})

export async function GET(request: NextRequest) {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  if (error) return error

  const url = request.nextUrl
  const q = url.searchParams.get('q') ?? ''
  const limit = parseInt(url.searchParams.get('limit') ?? '25')
  const page = parseInt(url.searchParams.get('page') ?? '0')
  const from = page * limit

  try {
    const data = await omClient<OmSearchResponse>(
      `/search/query?q=${encodeURIComponent(q || '*')}&index=table_search_index&from=${from}&size=${limit}`,
      session!
    )
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
