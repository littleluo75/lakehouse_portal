import { validateApiAuth } from '@/lib/api-auth'
import { getUserRoles, assignRole, removeRole } from '@/lib/services/keycloak-admin'
import { handleApiError } from '@/lib/api-error-handler'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await validateApiAuth(['SuperAdmin'])
  if (error) return error

  const { id } = await params

  try {
    const roles = await getUserRoles(id)
    return Response.json({ success: true, data: roles })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await validateApiAuth(['SuperAdmin'])
  if (error) return error

  const { id } = await params

  try {
    const { roleId, roleName } = await req.json() as { roleId: string; roleName: string }
    await assignRole(id, roleId, roleName)
    return Response.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await validateApiAuth(['SuperAdmin'])
  if (error) return error

  const { id } = await params

  try {
    const { roleId, roleName } = await req.json() as { roleId: string; roleName: string }

    if (session!.user.id === id && roleName === 'SuperAdmin') {
      return Response.json(
        { success: false, error: 'Không thể xóa role SuperAdmin của chính mình' },
        { status: 403 }
      )
    }

    await removeRole(id, roleId, roleName)
    return Response.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
