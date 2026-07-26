import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore, findConnection } from '@/lib/ba-draft/fixtures/store'
import { isoNow } from '@/lib/ba-draft/clock'
import type { ScenarioTrigger } from '@/lib/ba-draft/fixtures/types'

/**
 * Scenario-controllable so BA review / Playwright can deterministically
 * reproduce each outcome by passing `{ "scenario": "..." }` in the body,
 * instead of relying on chance. Defaults to "success".
 */
export const POST = createBaDraftHandler(async ({ params, request, persona: actor }) => {
  const connection = findConnection(params.id)
  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const scenario: ScenarioTrigger = body?.scenario ?? 'success'

  if (scenario === 'unavailable_downstream_tool') {
    connection.status = 'invalid'
    fixtureStore.appendAudit({ workspaceId: connection.workspaceId, actor: actor.id, action: 'connection.validate', target: connection.id, outcome: 'error', at: isoNow() })
    return NextResponse.json({ error: 'Downstream tool unavailable — validation could not complete.', code: 'UNAVAILABLE_TOOL' }, { status: 503 })
  }

  if (scenario === 'validation_failure') {
    connection.status = 'invalid'
    fixtureStore.appendAudit({ workspaceId: connection.workspaceId, actor: actor.id, action: 'connection.validate', target: connection.id, outcome: 'error', at: isoNow() })
    return NextResponse.json({ error: 'Credentials rejected by target system.', code: 'VALIDATION_ERROR' }, { status: 422 })
  }

  if (scenario === 'retry_failure') {
    connection.status = 'invalid'
    fixtureStore.appendAudit({ workspaceId: connection.workspaceId, actor: actor.id, action: 'connection.validate.retry', target: connection.id, outcome: 'error', at: isoNow() })
    return NextResponse.json({ error: 'Retry failed — target still unreachable.', code: 'RETRY_FAILED' }, { status: 503 })
  }

  // success / retry_success
  connection.status = 'active'
  connection.lastValidatedAt = isoNow()
  fixtureStore.appendAudit({ workspaceId: connection.workspaceId, actor: actor.id, action: 'connection.validate', target: connection.id, outcome: 'success', at: isoNow() })
  return NextResponse.json(connection)
})
