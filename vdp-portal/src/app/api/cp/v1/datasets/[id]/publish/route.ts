import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'
import { nextId, isoNow } from '@/lib/ba-draft/clock'
import type { ScenarioTrigger } from '@/lib/ba-draft/fixtures/types'

export const POST = createBaDraftHandler(
  async ({ params, request, persona: actor, workspace }) => {
    const state = fixtureStore.get()
    const dataset = state.datasets.find((d) => d.id === params.id)
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 })
    }
    const body = await request.json().catch(() => ({}))
    const scenario: ScenarioTrigger = body?.scenario ?? 'success'

    if (scenario === 'unavailable_downstream_tool') {
      dataset.publicationStatus = 'failed'
      return NextResponse.json({ error: 'Catalog tool unavailable — publish failed.', code: 'UNAVAILABLE_TOOL' }, { status: 503 })
    }

    dataset.publicationStatus = 'published'
    dataset.publishedAt = isoNow()
    dataset.catalogRegistered = true

    const entry = {
      id: nextId('cat'),
      datasetId: dataset.id,
      name: dataset.name,
      owner: actor.id,
      registeredAt: isoNow(),
    }
    state.catalogEntries = [...state.catalogEntries, entry]

    fixtureStore.appendAudit({ workspaceId: workspace.id, actor: actor.id, action: 'dataset.publish', target: dataset.id, outcome: 'success', at: isoNow() })
    fixtureStore.appendAudit({ workspaceId: workspace.id, actor: actor.id, action: 'catalog.register', target: entry.id, outcome: 'success', at: isoNow() })

    return NextResponse.json({ dataset, catalogEntry: entry })
  },
  { allowedRoles: ['DataEngineer', 'DataSteward', 'TenantAdmin', 'SuperAdmin'] }
)
