import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'

export const GET = createBaDraftHandler(async ({ workspace }) => {
  const state = fixtureStore.get()
  const connections = state.connections.filter((c) => c.workspaceId === workspace.id)
  const pipelines = state.pipelines.filter((p) => p.workspaceId === workspace.id)
  const accessRequests = state.accessRequests.filter((r) => r.workspaceId === workspace.id)
  const operations = state.operations.filter((o) => o.workspaceId === workspace.id)
  const datasets = state.datasets.filter((d) => d.workspaceId === workspace.id)

  return NextResponse.json({
    workspace,
    counts: {
      connections: connections.length,
      connectionsActive: connections.filter((c) => c.status === 'active').length,
      pipelines: pipelines.length,
      pipelinesRunning: pipelines.filter((p) => p.status === 'running').length,
      accessRequestsPending: accessRequests.filter((r) => r.status === 'pending').length,
      operationsFailed: operations.filter((o) => o.status === 'failed').length,
      datasetsPublished: datasets.filter((d) => d.publicationStatus === 'published').length,
    },
    recentOperations: operations.slice(0, 5),
  })
})
