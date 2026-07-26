import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'

/**
 * GET returns the operation's stored status alongside a separately
 * recomputed "observedStatus"/"observedAt" pair so the UI can distinguish
 * product status from (possibly stale) observed status, per the BA Draft
 * target experience's status-separation principle.
 */
export const GET = createBaDraftHandler(async ({ params }) => {
  const operation = fixtureStore.get().operations.find((op) => op.id === params.id)
  if (!operation) {
    return NextResponse.json({ error: 'Operation not found' }, { status: 404 })
  }
  return NextResponse.json(operation)
})
