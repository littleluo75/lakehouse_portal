import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'

export const GET = createBaDraftHandler(async () => {
  const { workspaces, memberships } = fixtureStore.get()
  const withCounts = workspaces.map((ws) => ({
    ...ws,
    memberCount: memberships.filter((m) => m.workspaceId === ws.id).length,
  }))
  return NextResponse.json({ items: withCounts })
})
