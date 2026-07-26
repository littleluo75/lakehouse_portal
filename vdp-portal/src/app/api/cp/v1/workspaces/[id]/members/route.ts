import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore, findWorkspace, findPersona } from '@/lib/ba-draft/fixtures/store'
import { nextId, isoNow } from '@/lib/ba-draft/clock'

export const GET = createBaDraftHandler(async ({ params }) => {
  const workspace = findWorkspace(params.id)
  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }
  const { memberships, personas } = fixtureStore.get()
  const items = memberships
    .filter((m) => m.workspaceId === params.id)
    .map((m) => ({ ...m, persona: personas.find((p) => p.id === m.personaId) }))
  return NextResponse.json({ items })
})

export const POST = createBaDraftHandler(
  async ({ params, request, persona: actor }) => {
    const workspace = findWorkspace(params.id)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }
    const body = await request.json().catch(() => null)
    const personaId = body?.personaId
    const entitlement = body?.entitlement ?? 'reader'
    const member = findPersona(personaId)
    if (!member) {
      return NextResponse.json({ error: 'Unknown persona id', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const state = fixtureStore.get()
    const already = state.memberships.find((m) => m.workspaceId === params.id && m.personaId === personaId)
    if (already) {
      return NextResponse.json({ error: 'Persona already a member', code: 'DUPLICATE_REQUEST' }, { status: 409 })
    }

    const record = { id: nextId('mem'), workspaceId: params.id, personaId, entitlement, addedAt: isoNow() }
    state.memberships = [...state.memberships, record]
    fixtureStore.appendAudit({
      workspaceId: params.id,
      actor: actor.id,
      action: 'workspace.member.add',
      target: personaId,
      outcome: 'success',
      at: isoNow(),
    })
    return NextResponse.json(record, { status: 201 })
  },
  { allowedRoles: ['TenantAdmin', 'SuperAdmin'] }
)
