import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'
import { isoNow } from '@/lib/ba-draft/clock'

export const POST = createBaDraftHandler(
  async ({ params, request, persona: actor }) => {
    const state = fixtureStore.get()
    const record = state.accessRequests.find((r) => r.id === params.id)
    if (!record) {
      return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
    }
    if (record.status !== 'pending') {
      return NextResponse.json({ error: `Request already ${record.status}`, code: 'VALIDATION_ERROR' }, { status: 409 })
    }
    const body = await request.json().catch(() => ({}))
    record.status = 'rejected'
    record.decidedAt = isoNow()
    record.decidedBy = actor.id
    record.reason = typeof body?.reason === 'string' ? body.reason : 'Rejected by approver.'

    fixtureStore.appendAudit({ workspaceId: record.workspaceId, actor: actor.id, action: 'access-request.reject', target: record.id, outcome: 'success', at: isoNow() })
    return NextResponse.json(record)
  },
  { allowedRoles: ['TenantAdmin', 'SuperAdmin'] }
)
