import { validateApiAuth } from '@/lib/api-auth'
import { createInternalClient } from '@/lib/internal-client'
import { handleApiError } from '@/lib/api-error-handler'
import type { JupyterProfile } from '@/types/jupyterhub'

const jupyterClient = createInternalClient({
  baseUrl: process.env.INTERNAL_JUPYTERHUB ?? '',
  authType: 'bearer',
})

const LARGE_ALLOWED_ROLES = ['DS', 'Admin', 'SuperAdmin']

export async function POST(request: Request) {
  const { session, error } = await validateApiAuth(['DE', 'DS', 'Admin', 'SuperAdmin'])
  if (error) return error

  try {
    const body = await request.json() as { profile: JupyterProfile }
    const { profile } = body

    if (!['standard', 'medium', 'large'].includes(profile)) {
      return Response.json({ success: false, error: 'Profile không hợp lệ' }, { status: 400 })
    }

    const userRoles = session!.user.roles
    if (profile === 'large' && !userRoles.some((r) => LARGE_ALLOWED_ROLES.includes(r))) {
      return Response.json(
        { success: false, error: 'Forbidden: role không được phép dùng profile Large' },
        { status: 403 }
      )
    }

    const username = session!.user.name
    await jupyterClient<unknown>(
      `/users/${encodeURIComponent(username)}/server`,
      session!,
      { method: 'POST', body: { profile_name: profile } }
    )

    return Response.json({ success: true, data: { message: 'Server đang khởi động' } })
  } catch (err) {
    return handleApiError(err)
  }
}
