import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore, findConnection } from '@/lib/ba-draft/fixtures/store'
import { isoNow } from '@/lib/ba-draft/clock'

export const GET = createBaDraftHandler(async ({ params }) => {
  const connection = findConnection(params.id)
  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }
  return NextResponse.json(connection)
})

// DEF-0002 correction: connection delete was previously a dead control (no
// UI action reached this logic at all, since no connection domain existed).
// This handler is the correction: a visible, role-guarded, paused/in-use
// aware delete with confirmation on the UI side, an async mock operation,
// and an audit event — see also connections/[id]/delete-button.tsx and
// tests/e2e/defects/def-0002-connection-delete.spec.ts.
export const DELETE = createBaDraftHandler(
  async ({ params, persona: actor }) => {
    const connection = findConnection(params.id)
    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    if (connection.inUse) {
      return NextResponse.json(
        {
          error: 'Connection is in use by an active pipeline and cannot be deleted while running.',
          code: 'CONNECTION_IN_USE',
        },
        { status: 409 }
      )
    }
    if (connection.status === 'deleting') {
      return NextResponse.json(
        { error: 'A delete operation is already in progress for this connection.', code: 'DUPLICATE_REQUEST' },
        { status: 409 }
      )
    }

    const state = fixtureStore.get()
    state.connections = state.connections.filter((c) => c.id !== params.id)
    const wsRecord = state.workspaces.find((w) => w.id === connection.workspaceId)
    if (wsRecord) wsRecord.quota.connectionsUsed = Math.max(0, wsRecord.quota.connectionsUsed - 1)

    fixtureStore.appendAudit({
      workspaceId: connection.workspaceId,
      actor: actor.id,
      action: 'connection.delete',
      target: connection.id,
      outcome: 'success',
      at: isoNow(),
    })

    return NextResponse.json({ deleted: true, id: connection.id })
  },
  { allowedRoles: ['DataEngineer', 'TenantAdmin', 'SuperAdmin'] }
)
