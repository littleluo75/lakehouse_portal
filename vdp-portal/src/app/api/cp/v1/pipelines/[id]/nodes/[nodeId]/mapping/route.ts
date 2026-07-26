import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore, findPipeline } from '@/lib/ba-draft/fixtures/store'
import { isoNow } from '@/lib/ba-draft/clock'

/**
 * DEF-0001 correction: field mapping is keyed by an explicit node ID
 * (params.nodeId), never a raw DOM/React event. The node must exist on the
 * pipeline before any mapping state is created or returned — see
 * src/components/product/dag/mapping-drawer.tsx for the client side and
 * tests/e2e/defects/def-0001-field-mapping.spec.ts for the regression test.
 */
export const GET = createBaDraftHandler(async ({ params }) => {
  const pipeline = findPipeline(params.id)
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }
  const node = pipeline.nodes.find((n) => n.id === params.nodeId)
  if (!node) {
    return NextResponse.json({ error: 'Node not found on this pipeline', code: 'VALIDATION_ERROR' }, { status: 404 })
  }

  const existing = fixtureStore.get().nodeMappings.find((m) => m.pipelineId === params.id && m.nodeId === params.nodeId)
  return NextResponse.json({
    node,
    mapping: existing ?? { nodeId: params.nodeId, pipelineId: params.id, revision: pipeline.revision, mappings: [], updatedAt: null },
  })
})

export const PUT = createBaDraftHandler(
  async ({ params, request, persona: actor, workspace }) => {
    const pipeline = findPipeline(params.id)
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }
    const node = pipeline.nodes.find((n) => n.id === params.nodeId)
    if (!node) {
      return NextResponse.json({ error: 'Node not found on this pipeline', code: 'VALIDATION_ERROR' }, { status: 404 })
    }
    if (node.type !== 'merge' && node.type !== 'transform') {
      return NextResponse.json(
        { error: `Node type "${node.type}" does not accept field mappings.`, code: 'VALIDATION_ERROR' },
        { status: 422 }
      )
    }

    const body = await request.json().catch(() => null)
    const mappings = Array.isArray(body?.mappings) ? body.mappings : null
    if (!mappings || mappings.some((m: unknown) => typeof m !== 'object' || m === null || !('sourceField' in m) || !('destField' in m))) {
      return NextResponse.json({ error: 'mappings must be an array of { sourceField, destField }', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const state = fixtureStore.get()
    const existingIndex = state.nodeMappings.findIndex((m) => m.pipelineId === params.id && m.nodeId === params.nodeId)
    const record = {
      nodeId: params.nodeId,
      pipelineId: params.id,
      revision: pipeline.revision,
      mappings,
      updatedAt: isoNow(),
    }
    if (existingIndex >= 0) {
      state.nodeMappings = state.nodeMappings.map((m, i) => (i === existingIndex ? record : m))
    } else {
      state.nodeMappings = [...state.nodeMappings, record]
    }

    fixtureStore.appendAudit({
      workspaceId: workspace.id,
      actor: actor.id,
      action: 'pipeline.node.mapping.save',
      target: `${params.id}/${params.nodeId}`,
      outcome: 'success',
      at: isoNow(),
    })

    return NextResponse.json(record)
  },
  { allowedRoles: ['DataEngineer', 'DataSteward', 'TenantAdmin', 'SuperAdmin'] }
)
