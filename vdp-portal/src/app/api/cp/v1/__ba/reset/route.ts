import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'
import { isoNow } from '@/lib/ba-draft/clock'

export const POST = createBaDraftHandler(async ({ persona }) => {
  fixtureStore.reset()
  fixtureStore.appendAudit({
    workspaceId: null,
    actor: persona.id,
    action: 'ba-draft.reset-demo-data',
    target: 'fixture-store',
    outcome: 'success',
    at: isoNow(),
  })
  return NextResponse.json({ reset: true })
})
