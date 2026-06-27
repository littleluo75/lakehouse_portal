import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'

const jupyterClient = createInternalClient({
  baseUrl: process.env.INTERNAL_JUPYTERHUB ?? '',
  authType: 'bearer',
})

export async function DELETE() {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'Admin', 'SuperAdmin'])
  if (error) return error

  try {
    const username = session!.user.name
    await jupyterClient<unknown>(
      `/users/${encodeURIComponent(username)}/server`,
      session!,
      { method: 'DELETE' }
    )

    return Response.json({ success: true, data: { message: 'Workspace đã được tắt' } })
  } catch (err) {
    return handleApiError(err)
  }
}
