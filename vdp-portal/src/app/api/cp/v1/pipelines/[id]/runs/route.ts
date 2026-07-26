import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore, findPipeline } from '@/lib/ba-draft/fixtures/store'
import { nextId, isoNow } from '@/lib/ba-draft/clock'
import type { ScenarioTrigger, PipelineRun } from '@/lib/ba-draft/fixtures/types'

export const GET = createBaDraftHandler(async ({ params }) => {
  const items = fixtureStore.get().pipelineRuns.filter((r) => r.pipelineId === params.id)
  return NextResponse.json({ items })
})

/** Scenario-controllable trigger: body may pass { scenario, retryOfRunId }. */
export const POST = createBaDraftHandler(
  async ({ params, request, persona: actor, workspace }) => {
    const pipeline = findPipeline(params.id)
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
    }
    const body = await request.json().catch(() => ({}))
    const scenario: ScenarioTrigger = body?.scenario ?? 'success'
    const retryOfRunId: string | null = body?.retryOfRunId ?? null

    const state = fixtureStore.get()
    const run: PipelineRun = {
      id: nextId('run'),
      pipelineId: params.id,
      status: 'running',
      startedAt: isoNow(),
      finishedAt: null,
      retryOfRunId,
    }

    if (scenario === 'retry_failure' || scenario === 'unavailable_downstream_tool') {
      run.status = 'failed'
      run.finishedAt = isoNow()
    } else if (scenario === 'partial_provisioning') {
      run.status = 'partial'
      run.finishedAt = isoNow()
    } else if (scenario === 'cancellation') {
      run.status = 'cancelled'
      run.finishedAt = isoNow()
    } else if (scenario === 'success' || scenario === 'retry_success') {
      run.status = 'succeeded'
      run.finishedAt = isoNow()
    }
    // otherwise stays "running" (loading state)

    state.pipelineRuns = [...state.pipelineRuns, run]
    pipeline.status = run.status === 'running' ? 'running' : run.status === 'failed' ? 'failed' : 'idle'

    fixtureStore.appendAudit({
      workspaceId: workspace.id,
      actor: actor.id,
      action: retryOfRunId ? 'pipeline.run.retry' : 'pipeline.run.trigger',
      target: run.id,
      outcome: run.status === 'failed' ? 'error' : 'success',
      at: isoNow(),
    })

    return NextResponse.json(run, { status: 201 })
  },
  { allowedRoles: ['DataEngineer', 'DataSteward', 'TenantAdmin', 'SuperAdmin'] }
)
