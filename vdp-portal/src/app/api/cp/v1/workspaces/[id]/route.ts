import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'

export const GET = createBaDraftHandler(async ({ params }) => {
  const workspace = fixtureStore.get().workspaces.find((w) => w.id === params.id)
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }
  return NextResponse.json(workspace)
})
