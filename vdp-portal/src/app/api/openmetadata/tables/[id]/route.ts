import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { openmetadataClient as omClient } from '@/lib/services'
import type { DataAsset } from '@/types/openmetadata'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  if (error) return error

  const { id } = await params

  try {
    const data = await omClient<DataAsset>(
      `/tables/${encodeURIComponent(id)}?fields=columns,tags,owner,followers`,
      session!
    )
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
