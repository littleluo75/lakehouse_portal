import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'
import { nextId, isoNow } from '@/lib/ba-draft/clock'
import type { ScenarioTrigger } from '@/lib/ba-draft/fixtures/types'

const READ_ONLY_ROLES = new Set(['Analyst', 'PIIReader'])

export const POST = createBaDraftHandler(async ({ request, persona: actor, workspace }) => {
  const body = await request.json().catch(() => ({}))
  const sql = typeof body?.sql === 'string' ? body.sql : ''
  const scenario: ScenarioTrigger = body?.scenario ?? 'success'

  if (scenario === 'unauthorized') {
    return NextResponse.json({ error: 'Session expired. Please switch persona again.', code: 'SESSION_EXPIRED' }, { status: 401 })
  }

  if (!sql.trim()) {
    return NextResponse.json({ error: 'sql is required', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  const isWrite = !/^\s*(select|show|describe|desc|explain|with)\b/i.test(sql)
  if (isWrite && READ_ONLY_ROLES.has(actor.role)) {
    const record = {
      id: nextId('qr'),
      workspaceId: workspace.id,
      requestedBy: actor.id,
      sql,
      status: 'forbidden' as const,
      rowCount: null,
      createdAt: isoNow(),
    }
    fixtureStore.get().queryRequests.push(record)
    fixtureStore.appendAudit({ workspaceId: workspace.id, actor: actor.id, action: 'query.execute', target: record.id, outcome: 'denied', at: isoNow() })
    return NextResponse.json({ error: `Role "${actor.role}" is read-only and cannot run write statements.`, code: 'FORBIDDEN' }, { status: 403 })
  }

  const record = {
    id: nextId('qr'),
    workspaceId: workspace.id,
    requestedBy: actor.id,
    sql,
    status: scenario === 'unavailable_downstream_tool' ? ('failed' as const) : ('succeeded' as const),
    rowCount: scenario === 'unavailable_downstream_tool' ? null : 3,
    createdAt: isoNow(),
  }
  fixtureStore.get().queryRequests.push(record)
  fixtureStore.appendAudit({ workspaceId: workspace.id, actor: actor.id, action: 'query.execute', target: record.id, outcome: record.status === 'failed' ? 'error' : 'success', at: isoNow() })

  if (record.status === 'failed') {
    return NextResponse.json({ error: 'Query engine unavailable (mock).', code: 'UNAVAILABLE_TOOL' }, { status: 503 })
  }

  return NextResponse.json({
    ...record,
    rows: [
      { id: 1, name: 'Mock row A', amount: 1200000 },
      { id: 2, name: 'Mock row B', amount: 850000 },
      { id: 3, name: 'Mock row C', amount: 430000 },
    ],
  })
})
