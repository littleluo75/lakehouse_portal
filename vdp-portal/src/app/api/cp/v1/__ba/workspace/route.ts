import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { WORKSPACE_COOKIE } from '@/lib/ba-draft/session'
import { WORKSPACES } from '@/lib/ba-draft/fixtures/seed'

export const POST = createBaDraftHandler(async ({ request }) => {
  const body = await request.json().catch(() => null)
  const workspaceId = body?.workspaceId
  const workspace = WORKSPACES.find((w) => w.id === workspaceId)
  if (!workspace) {
    return NextResponse.json({ error: 'Unknown workspace id', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const response = NextResponse.json({ workspace })
  response.cookies.set(WORKSPACE_COOKIE, workspace.id, { path: '/', sameSite: 'lax' })
  return response
})
