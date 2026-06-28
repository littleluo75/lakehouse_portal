import { validateApiAuth } from '@/lib/api-auth'
import { handleApiError } from '@/lib/api-error-handler'
import { openmetadataClient as omClient } from '@/lib/services'
import type { OmTablesResponse } from '@/types/openmetadata'

export async function GET() {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  if (error) return error

  try {
    const data = await omClient<OmTablesResponse>(
      '/tables?limit=25&fields=columns,tags,owner',
      session!
    )
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
