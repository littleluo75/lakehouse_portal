import { resetClock, seedCounter } from '../clock'
import * as seed from './seed'
import type {
  AccessRequest,
  AuditEvent,
  CatalogEntry,
  Connection,
  Dataset,
  Membership,
  Notification,
  NodeMapping,
  Operation,
  Persona,
  Pipeline,
  PipelineRun,
  QueryRequest,
  Workspace,
} from './types'

interface FixtureState {
  personas: Persona[]
  workspaces: Workspace[]
  memberships: Membership[]
  connections: Connection[]
  accessRequests: AccessRequest[]
  pipelines: Pipeline[]
  nodeMappings: NodeMapping[]
  pipelineRuns: PipelineRun[]
  operations: Operation[]
  datasets: Dataset[]
  catalogEntries: CatalogEntry[]
  queryRequests: QueryRequest[]
  auditEvents: AuditEvent[]
  notifications: Notification[]
}

function buildInitialState(): FixtureState {
  return {
    personas: structuredClone(seed.PERSONAS),
    workspaces: structuredClone(seed.WORKSPACES),
    memberships: structuredClone(seed.MEMBERSHIPS),
    connections: structuredClone(seed.CONNECTIONS),
    accessRequests: structuredClone(seed.ACCESS_REQUESTS),
    pipelines: structuredClone(seed.PIPELINES),
    nodeMappings: Object.entries(seed.NODE_MAPPINGS_SEED).map(([nodeId, mappings]) => ({
      nodeId,
      pipelineId: 'pipe-0001',
      revision: 1,
      mappings: structuredClone(mappings),
      updatedAt: seed.PIPELINES[0].createdAt,
    })),
    pipelineRuns: structuredClone(seed.PIPELINE_RUNS),
    operations: structuredClone(seed.OPERATIONS),
    datasets: structuredClone(seed.DATASETS),
    catalogEntries: structuredClone(seed.CATALOG_ENTRIES),
    queryRequests: structuredClone(seed.QUERY_REQUESTS),
    auditEvents: structuredClone(seed.AUDIT_EVENTS),
    notifications: structuredClone(seed.NOTIFICATIONS),
  }
}

// Prefixes generated at runtime via nextId() that also appear as literal
// seeded IDs — the counter must start past the seeded count so a freshly
// created record can never collide with a seeded one (e.g. the first
// generated connection must be "conn-0006", not re-mint "conn-0001").
function seedIdCounters(initial: FixtureState): void {
  seedCounter('mem', initial.memberships.length)
  seedCounter('conn', initial.connections.length)
  seedCounter('ar', initial.accessRequests.length)
  seedCounter('run', initial.pipelineRuns.length)
  seedCounter('cat', initial.catalogEntries.length)
  seedCounter('qr', initial.queryRequests.length)
}

let state: FixtureState = buildInitialState()
seedIdCounters(state)

/** The single mutable in-memory fixture store for BA Draft mode. */
export const fixtureStore = {
  get(): FixtureState {
    return state
  },
  reset(): void {
    resetClock()
    state = buildInitialState()
    seedIdCounters(state)
  },
  appendAudit(event: Omit<AuditEvent, 'id'> & { id?: string }): AuditEvent {
    const record: AuditEvent = { ...event, id: event.id ?? `audit-${String(state.auditEvents.length + 1).padStart(4, '0')}` }
    state.auditEvents = [record, ...state.auditEvents]
    return record
  },
}

export function findWorkspace(id: string) {
  return fixtureStore.get().workspaces.find((w) => w.id === id)
}

export function findConnection(id: string) {
  return fixtureStore.get().connections.find((c) => c.id === id)
}

export function findPipeline(id: string) {
  return fixtureStore.get().pipelines.find((p) => p.id === id)
}

export function findPersona(id: string) {
  return fixtureStore.get().personas.find((p) => p.id === id)
}
