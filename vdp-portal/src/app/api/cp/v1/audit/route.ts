import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'

export const GET = createBaDraftHandler(
  async ({ workspace }) => {
    const items = fixtureStore.get().auditEvents.filter((e) => e.workspaceId === null || e.workspaceId === workspace.id)
    return NextResponse.json({ items })
  },
  { allowedRoles: ['TenantAdmin', 'SuperAdmin'] }
)
