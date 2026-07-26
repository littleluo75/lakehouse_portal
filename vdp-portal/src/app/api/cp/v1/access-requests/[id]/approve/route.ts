import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'
import { isoNow } from '@/lib/ba-draft/clock'

export const POST = createBaDraftHandler(
  async ({ params, persona: actor }) => {
    const state = fixtureStore.get()
    const record = state.accessRequests.find((r) => r.id === params.id)
    if (!record) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }
    if (record.status !== 'pending') {
      return NextResponse.json({ error: `Request already ${record.status}`, code: 'VALIDATION_ERROR' }, { status: 409 })
    }
    record.status = 'approved'
    record.decidedAt = isoNow()
    record.decidedBy = actor.id

    const membershipExists = state.memberships.some((m) => m.workspaceId === record.workspaceId && m.personaId === record.requestedBy)
    if (!membershipExists) {
      state.memberships = [
        ...state.memberships,
        { id: `mem-${record.id}`, workspaceId: record.workspaceId, personaId: record.requestedBy, entitlement: record.entitlement, addedAt: isoNow() },
      ]
    }

    fixtureStore.appendAudit({ workspaceId: record.workspaceId, actor: actor.id, action: 'access-request.approve', target: record.id, outcome: 'success', at: isoNow() })
    return NextResponse.json(record)
  },
  { allowedRoles: ['TenantAdmin', 'SuperAdmin'] }
)
