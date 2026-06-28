import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { openmetadataClient as omClient } from '@/lib/services'
import type { LineageData } from '@/types/openmetadata'

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
