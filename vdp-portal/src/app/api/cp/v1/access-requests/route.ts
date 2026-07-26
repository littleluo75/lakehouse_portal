import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'
import { nextId, isoNow } from '@/lib/ba-draft/clock'

export const GET = createBaDraftHandler(async ({ workspace }) => {
  const items = fixtureStore.get().accessRequests.filter((r) => r.workspaceId === workspace.id)
  return NextResponse.json({ items })
})

export const POST = createBaDraftHandler(async ({ request, workspace, persona: actor }) => {
  const body = await request.json().catch(() => null)
  const resource = body?.resource
  const entitlement = body?.entitlement ?? 'reader'
  if (!resource || typeof resource !== 'string') {
    return NextResponse.json({ error: 'resource is required', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const state = fixtureStore.get()
  const duplicate = state.accessRequests.find(
    (r) => r.workspaceId === workspace.id && r.resource === resource && r.requestedBy === actor.id && r.status === 'pending'
  )
  if (duplicate) {
    return NextResponse.json({ error: 'An identical request is already pending.', code: 'DUPLICATE_REQUEST' }, { status: 409 })
  }

  const record = {
    id: nextId('ar'),
    workspaceId: workspace.id,
    requestedBy: actor.id,
    resource,
    entitlement,
    status: 'pending' as const,
    createdAt: isoNow(),
    decidedAt: null,
    decidedBy: null,
    reason: null,
  }
  state.accessRequests = [...state.accessRequests, record]
  fixtureStore.appendAudit({ workspaceId: workspace.id, actor: actor.id, action: 'access-request.create', target: record.id, outcome: 'success', at: isoNow() })
  return NextResponse.json(record, { status: 201 })
})
