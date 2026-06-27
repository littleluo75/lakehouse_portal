import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import type { LineageData } from '@/types/openmetadata'

const omClient = createInternalClient({
  baseUrl: process.env.INTERNAL_OPENMETADATA ?? '',
  authType: 'basic',
  basicCredentials: { username: 'admin', password: 'admin' },
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { id } = await params

  try {
    const data = await omClient<LineageData>(
      `/lineage/table/${encodeURIComponent(id)}?upstreamDepth=2&downstreamDepth=2`,
      session!
    )
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
