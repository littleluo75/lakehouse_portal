import type {
  AccessRequest,
  AuditEvent,
  CatalogEntry,
  Connection,
  Dataset,
  Membership,
  Notification,
  Operation,
  Persona,
  Pipeline,
  PipelineRun,
  QueryRequest,
  Workspace,
} from './types'

/**
 * Deterministic seed state for BA Draft. Every timestamp/id below is a fixed
 * literal (not generated via now()/nextId()) so the seed is stable across
 * process restarts and diffable in review.
 */

export const PERSONAS: Persona[] = [
  { id: 'persona-super-admin', name: 'Nguyễn Văn Super', role: 'SuperAdmin', email: 'super.admin@ba-draft.local' },
  { id: 'persona-tenant-admin', name: 'Trần Thị Tenant', role: 'TenantAdmin', email: 'tenant.admin@ba-draft.local' },
  { id: 'persona-data-engineer', name: 'Lê Văn Engineer', role: 'DataEngineer', email: 'data.engineer@ba-draft.local' },
  { id: 'persona-data-steward', name: 'Phạm Thị Steward', role: 'DataSteward', email: 'data.steward@ba-draft.local' },
  { id: 'persona-analyst', name: 'Hoàng Văn Analyst', role: 'Analyst', email: 'analyst@ba-draft.local' },
  { id: 'persona-pii-reader', name: 'Vũ Thị PII', role: 'PIIReader', email: 'pii.reader@ba-draft.local' },
]

export const WORKSPACES: Workspace[] = [
  {
    id: 'ws-0001',
    name: 'Tenant Alpha — Sales Analytics',
    tenant: 'alpha',
    quota: { storageGbLimit: 500, storageGbUsed: 340, connectionsLimit: 10, connectionsUsed: 3 },
    createdAt: '2026-01-06T02:00:00.000Z',
  },
  {
    id: 'ws-0002',
    name: 'Tenant Beta — IoT Telemetry',
    tenant: 'beta',
    quota: { storageGbLimit: 200, storageGbUsed: 198, connectionsLimit: 5, connectionsUsed: 5 },
    createdAt: '2026-01-06T02:05:00.000Z',
  },
  {
    id: 'ws-0003',
    name: 'Tenant Gamma — Finance Reporting',
    tenant: 'gamma',
    quota: { storageGbLimit: 1000, storageGbUsed: 120, connectionsLimit: 20, connectionsUsed: 2 },
    createdAt: '2026-01-06T02:10:00.000Z',
  },
]

export const MEMBERSHIPS: Membership[] = [
  { id: 'mem-0001', workspaceId: 'ws-0001', personaId: 'persona-tenant-admin', entitlement: 'owner', addedAt: '2026-01-06T02:00:00.000Z' },
  { id: 'mem-0002', workspaceId: 'ws-0001', personaId: 'persona-data-engineer', entitlement: 'contributor', addedAt: '2026-01-06T02:01:00.000Z' },
  { id: 'mem-0003', workspaceId: 'ws-0001', personaId: 'persona-analyst', entitlement: 'reader', addedAt: '2026-01-06T02:02:00.000Z' },
  { id: 'mem-0004', workspaceId: 'ws-0002', personaId: 'persona-data-engineer', entitlement: 'owner', addedAt: '2026-01-06T02:05:00.000Z' },
  { id: 'mem-0005', workspaceId: 'ws-0002', personaId: 'persona-data-steward', entitlement: 'contributor', addedAt: '2026-01-06T02:06:00.000Z' },
  { id: 'mem-0006', workspaceId: 'ws-0003', personaId: 'persona-tenant-admin', entitlement: 'owner', addedAt: '2026-01-06T02:10:00.000Z' },
  { id: 'mem-0007', workspaceId: 'ws-0003', personaId: 'persona-pii-reader', entitlement: 'reader', addedAt: '2026-01-06T02:11:00.000Z' },
]

export const CONNECTIONS: Connection[] = [
  { id: 'conn-0001', workspaceId: 'ws-0001', name: 'Sales JDBC (StarRocks mock)', type: 'jdbc', status: 'active', inUse: false, lastValidatedAt: '2026-01-06T02:30:00.000Z', createdAt: '2026-01-06T02:15:00.000Z' },
  { id: 'conn-0002', workspaceId: 'ws-0001', name: 'Object Storage — sales-raw (mock)', type: 'object-storage', status: 'active', inUse: true, lastValidatedAt: '2026-01-06T02:31:00.000Z', createdAt: '2026-01-06T02:16:00.000Z' },
  { id: 'conn-0003', workspaceId: 'ws-0001', name: 'Legacy CRM API (mock, paused)', type: 'api', status: 'paused', inUse: false, lastValidatedAt: '2025-12-01T02:00:00.000Z', createdAt: '2025-11-01T02:00:00.000Z' },
  { id: 'conn-0004', workspaceId: 'ws-0002', name: 'IoT Ingest JDBC (mock)', type: 'jdbc', status: 'active', inUse: true, lastValidatedAt: '2026-01-06T02:32:00.000Z', createdAt: '2026-01-06T02:20:00.000Z' },
  { id: 'conn-0005', workspaceId: 'ws-0003', name: 'Finance Object Storage (mock)', type: 'object-storage', status: 'invalid', inUse: false, lastValidatedAt: '2026-01-05T02:00:00.000Z', createdAt: '2026-01-04T02:00:00.000Z' },
]

export const ACCESS_REQUESTS: AccessRequest[] = [
  { id: 'ar-0001', workspaceId: 'ws-0001', requestedBy: 'persona-analyst', resource: 'conn-0001', entitlement: 'contributor', status: 'pending', createdAt: '2026-01-06T03:00:00.000Z', decidedAt: null, decidedBy: null, reason: null },
  { id: 'ar-0002', workspaceId: 'ws-0002', requestedBy: 'persona-data-steward', resource: 'conn-0004', entitlement: 'owner', status: 'approved', createdAt: '2026-01-05T03:00:00.000Z', decidedAt: '2026-01-05T04:00:00.000Z', decidedBy: 'persona-data-engineer', reason: 'Approved for telemetry pipeline ownership handoff.' },
  { id: 'ar-0003', workspaceId: 'ws-0003', requestedBy: 'persona-pii-reader', resource: 'conn-0005', entitlement: 'contributor', status: 'rejected', createdAt: '2026-01-04T03:00:00.000Z', decidedAt: '2026-01-04T05:00:00.000Z', decidedBy: 'persona-tenant-admin', reason: 'PII reader role limited to read-only entitlement.' },
]

export const PIPELINES: Pipeline[] = [
  {
    id: 'pipe-0001',
    workspaceId: 'ws-0001',
    name: 'Sales Daily Ingest',
    status: 'idle',
    revision: 3,
    createdAt: '2026-01-06T02:40:00.000Z',
    nodes: [
      { id: 'node-ingest-01', type: 'ingest', label: 'Ingest — Sales JDBC', sourceCount: 1 },
      { id: 'node-transform-01', type: 'transform', label: 'Transform — Normalize currency', sourceCount: 1 },
      { id: 'node-merge-01', type: 'merge', label: 'Merge — Sales + Region lookup', sourceCount: 2 },
      { id: 'node-quality-01', type: 'quality', label: 'Quality — Non-null customer_id', sourceCount: 1 },
    ],
  },
  {
    id: 'pipe-0002',
    workspaceId: 'ws-0002',
    name: 'IoT Telemetry Rollup',
    status: 'running',
    revision: 7,
    createdAt: '2026-01-06T02:45:00.000Z',
    nodes: [
      { id: 'node-ingest-02', type: 'ingest', label: 'Ingest — Device telemetry stream', sourceCount: 1 },
      { id: 'node-transform-02', type: 'transform', label: 'Transform — Downsample 1min', sourceCount: 1 },
    ],
  },
]

export const NODE_MAPPINGS_SEED: Record<string, { sourceField: string; destField: string }[]> = {
  'node-merge-01': [
    { sourceField: 'sales.customer_id', destField: 'fact_sales.customer_id' },
    { sourceField: 'sales.amount', destField: 'fact_sales.amount_vnd' },
    { sourceField: 'region.region_code', destField: 'fact_sales.region_code' },
  ],
}

export const PIPELINE_RUNS: PipelineRun[] = [
  { id: 'run-0001', pipelineId: 'pipe-0001', status: 'succeeded', startedAt: '2026-01-05T20:00:00.000Z', finishedAt: '2026-01-05T20:04:00.000Z', retryOfRunId: null },
  { id: 'run-0002', pipelineId: 'pipe-0002', status: 'running', startedAt: '2026-01-06T01:55:00.000Z', finishedAt: null, retryOfRunId: null },
]

export const OPERATIONS: Operation[] = [
  { id: 'op-0001', workspaceId: 'ws-0001', kind: 'connection.validate', status: 'succeeded', observedStatus: 'succeeded', observedAt: '2026-01-06T02:30:05.000Z', startedAt: '2026-01-06T02:30:00.000Z', finishedAt: '2026-01-06T02:30:05.000Z', retryCount: 0, message: null },
  { id: 'op-0002', workspaceId: 'ws-0002', kind: 'pipeline.run', status: 'running', observedStatus: 'running', observedAt: '2026-01-06T02:00:00.000Z', startedAt: '2026-01-06T01:55:00.000Z', finishedAt: null, retryCount: 0, message: 'Processing 1.2M events' },
  { id: 'op-0003', workspaceId: 'ws-0003', kind: 'dataset.publish', status: 'failed', observedStatus: 'failed', observedAt: '2026-01-05T22:10:00.000Z', startedAt: '2026-01-05T22:05:00.000Z', finishedAt: '2026-01-05T22:10:00.000Z', retryCount: 2, message: 'Downstream catalog tool unavailable after 2 retries' },
]

export const DATASETS: Dataset[] = [
  { id: 'ds-0001', workspaceId: 'ws-0001', name: 'fact_sales_daily', publicationStatus: 'published', catalogRegistered: true, publishedAt: '2026-01-05T10:00:00.000Z' },
  { id: 'ds-0002', workspaceId: 'ws-0002', name: 'iot_telemetry_1min', publicationStatus: 'draft', catalogRegistered: false, publishedAt: null },
]

export const CATALOG_ENTRIES: CatalogEntry[] = [
  { id: 'cat-0001', datasetId: 'ds-0001', name: 'fact_sales_daily', owner: 'persona-data-engineer', registeredAt: '2026-01-05T10:05:00.000Z' },
]

export const QUERY_REQUESTS: QueryRequest[] = [
  { id: 'qr-0001', workspaceId: 'ws-0001', requestedBy: 'persona-analyst', sql: 'SELECT * FROM fact_sales_daily LIMIT 100', status: 'succeeded', rowCount: 100, createdAt: '2026-01-06T03:10:00.000Z' },
]

export const AUDIT_EVENTS: AuditEvent[] = [
  { id: 'audit-0001', workspaceId: 'ws-0001', actor: 'persona-tenant-admin', action: 'workspace.create', target: 'ws-0001', outcome: 'success', at: '2026-01-06T02:00:00.000Z' },
  { id: 'audit-0002', workspaceId: 'ws-0003', actor: 'persona-tenant-admin', action: 'access-request.reject', target: 'ar-0003', outcome: 'success', at: '2026-01-04T05:00:00.000Z' },
]

export const NOTIFICATIONS: Notification[] = [
  { id: 'notif-0001', personaId: 'persona-analyst', title: 'Access request submitted', body: 'Your request for conn-0001 contributor access is pending approval.', read: false, createdAt: '2026-01-06T03:00:00.000Z' },
]
