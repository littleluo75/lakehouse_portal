import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'
import { nextId, isoNow } from '@/lib/ba-draft/clock'

export const GET = createBaDraftHandler(async ({ workspace }) => {
  const items = fixtureStore.get().connections.filter((c) => c.workspaceId === workspace.id)
  return NextResponse.json({ items })
})

export const POST = createBaDraftHandler(
  async ({ request, workspace, persona: actor }) => {
    const body = await request.json().catch(() => null)
    const name = body?.name
    const type = body?.type
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Connection name is required', code: 'VALIDATION_ERROR' }, { status: 400 })
    }
    if (!['jdbc', 'object-storage', 'api'].includes(type)) {
      return NextResponse.json({ error: 'Invalid connection type', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const wsRecord = fixtureStore.get().workspaces.find((w) => w.id === workspace.id)!
    if (wsRecord.quota.connectionsUsed >= wsRecord.quota.connectionsLimit) {
      return NextResponse.json(
        { error: 'Workspace connection quota exceeded', code: 'QUOTA_EXCEEDED' },
        { status: 409 }
      )
    }

    const record = {
      id: nextId('conn'),
      workspaceId: workspace.id,
      name: name.trim(),
      type,
      status: 'validating' as const,
      inUse: false,
      lastValidatedAt: null,
      createdAt: isoNow(),
    }
    const state = fixtureStore.get()
    state.connections = [...state.connections, record]
    wsRecord.quota.connectionsUsed += 1

    fixtureStore.appendAudit({
      workspaceId: workspace.id,
      actor: actor.id,
      action: 'connection.create',
      target: record.id,
      outcome: 'success',
      at: isoNow(),
    })

    return NextResponse.json(record, { status: 201 })
  },
  { allowedRoles: ['DataEngineer', 'TenantAdmin', 'SuperAdmin'] }
)
