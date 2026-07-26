/**
 * BA Draft mock domain contracts. These are illustrative shapes for the
 * mock Control Plane surface at /api/cp/v1 — NOT a complete or final
 * Product Control Plane API. Real integration will replace the mock
 * implementation behind the same ProductApi client boundary.
 */

export type PersonaRole =
  | 'SuperAdmin'
  | 'TenantAdmin'
  | 'DataEngineer'
  | 'DataSteward'
  | 'Analyst'
  | 'PIIReader'

export interface Persona {
  id: string
  name: string
  role: PersonaRole
  email: string
}

export interface Workspace {
  id: string
  name: string
  tenant: string
  quota: Quota
  createdAt: string
}

export interface Quota {
  storageGbLimit: number
  storageGbUsed: number
  connectionsLimit: number
  connectionsUsed: number
}

export type EntitlementLevel = 'owner' | 'contributor' | 'reader'

export interface Membership {
  id: string
  workspaceId: string
  personaId: string
  entitlement: EntitlementLevel
  addedAt: string
}

export type ConnectionStatus = 'active' | 'paused' | 'validating' | 'invalid' | 'deleting'

export interface Connection {
  id: string
  workspaceId: string
  name: string
  type: 'jdbc' | 'object-storage' | 'api'
  status: ConnectionStatus
  inUse: boolean
  lastValidatedAt: string | null
  createdAt: string
}

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'duplicate'

export interface AccessRequest {
  id: string
  workspaceId: string
  requestedBy: string
  resource: string
  entitlement: EntitlementLevel
  status: AccessRequestStatus
  createdAt: string
  decidedAt: string | null
  decidedBy: string | null
  reason: string | null
}

export type OperationStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'partial'
  | 'cancelled'

export interface Operation {
  id: string
  workspaceId: string
  kind: string
  status: OperationStatus
  observedStatus: OperationStatus
  observedAt: string
  startedAt: string
  finishedAt: string | null
  retryCount: number
  message: string | null
}

export type PipelineNodeType = 'ingest' | 'transform' | 'merge' | 'quality'

export interface PipelineNode {
  id: string
  type: PipelineNodeType
  label: string
  sourceCount: number
}

export interface FieldMapping {
  sourceField: string
  destField: string
}

export interface NodeMapping {
  nodeId: string
  pipelineId: string
  revision: number
  mappings: FieldMapping[]
  updatedAt: string
}

export type PipelineStatus = 'idle' | 'running' | 'succeeded' | 'failed'

export interface Pipeline {
  id: string
  workspaceId: string
  name: string
  status: PipelineStatus
  revision: number
  nodes: PipelineNode[]
  createdAt: string
}

export interface PipelineRun {
  id: string
  pipelineId: string
  status: OperationStatus
  startedAt: string
  finishedAt: string | null
  retryOfRunId: string | null
}

export type DatasetPublicationStatus = 'draft' | 'publishing' | 'published' | 'failed'

export interface Dataset {
  id: string
  workspaceId: string
  name: string
  publicationStatus: DatasetPublicationStatus
  catalogRegistered: boolean
  publishedAt: string | null
}

export interface CatalogEntry {
  id: string
  datasetId: string
  name: string
  owner: string
  registeredAt: string
}

export type QueryStatus = 'succeeded' | 'failed' | 'forbidden' | 'running'

export interface QueryRequest {
  id: string
  workspaceId: string
  requestedBy: string
  sql: string
  status: QueryStatus
  rowCount: number | null
  createdAt: string
}

export interface AuditEvent {
  id: string
  workspaceId: string | null
  actor: string
  action: string
  target: string
  outcome: 'success' | 'denied' | 'error'
  at: string
}

export interface Notification {
  id: string
  personaId: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

export type ScenarioTrigger =
  | 'success'
  | 'validation_failure'
  | 'unauthorized'
  | 'forbidden'
  | 'quota_exceeded'
  | 'approval_pending'
  | 'approval_rejected'
  | 'duplicate_request'
  | 'partial_provisioning'
  | 'unavailable_downstream_tool'
  | 'retry_success'
  | 'retry_failure'
  | 'cancellation'
  | 'stale_observed_status'
