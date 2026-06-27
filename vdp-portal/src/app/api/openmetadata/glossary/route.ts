import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import type { GlossaryTermsResponse } from '@/types/openmetadata'

const omClient = createInternalClient({
  baseUrl: process.env.INTERNAL_OPENMETADATA ?? '',
  authType: 'basic',
  basicCredentials: { username: 'admin', password: 'admin' },
})

export async function GET() {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  if (error) return error

  try {
    const data = await omClient<GlossaryTermsResponse>(
      '/glossaryTerms?limit=50',
      session!
    )
    return Response.json({ success: true, data })
  } catch (err) {
    return handleApiError(err)
  }
}
