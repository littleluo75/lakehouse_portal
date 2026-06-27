import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import type { JupyterUserResponse, JupyterServerStatus } from '@/types/jupyterhub'

const jupyterClient = createInternalClient({
  baseUrl: process.env.INTERNAL_JUPYTERHUB ?? '',
  authType: 'bearer',
})

export async function GET() {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'Admin', 'SuperAdmin'])
  if (error) return error

  try {
    const username = session!.user.name
    const data = await jupyterClient<JupyterUserResponse>(
      `/users/${encodeURIComponent(username)}`,
      session!
    )

    let status: JupyterServerStatus['status'] = 'stopped'
    if (data.server !== null) {
      status = data.server.ready ? 'running' : 'starting'
    }

    const result: JupyterServerStatus = { status, server: data.server, username }
    return Response.json({ success: true, data: result })
  } catch (err) {
    return handleApiError(err)
  }
}
