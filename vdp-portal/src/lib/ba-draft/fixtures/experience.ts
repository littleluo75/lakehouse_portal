/** Deterministic, fictional presentation metadata used only by BA Draft UI. */
export const workspaceExperience: Record<string, { unit: string; owner: string; environment: string; type: string; services: number; health: string; pending: number; lifecycle: string; lastActivity: string; computePct: number }> = {
  'ws-0001': { unit: 'Khối Kinh doanh số giả lập', owner: 'Nhóm Quản trị Alpha', environment: 'UAT', type: 'Analytics', services: 8, health: 'Healthy', pending: 2, lifecycle: 'Active', lastActivity: '06/01/2026 10:30', computePct: 58 },
  'ws-0002': { unit: 'Trung tâm IoT giả lập', owner: 'Nhóm Nền tảng Beta', environment: 'DEV', type: 'Streaming', services: 6, health: 'At risk', pending: 1, lifecycle: 'Active', lastActivity: '06/01/2026 09:55', computePct: 81 },
  'ws-0003': { unit: 'Ban Tài chính giả lập', owner: 'Nhóm Báo cáo Gamma', environment: 'UAT', type: 'Reporting', services: 5, health: 'Degraded', pending: 0, lifecycle: 'Review', lastActivity: '05/01/2026 22:10', computePct: 34 },
}

export const connectionExperience: Record<string, { owner: string; credential: string; validation: string; health: string; dependencies: string; lifecycle: string; operation: string }> = {
  'conn-0001': { owner: 'Data Engineering Alpha', credential: 'Vault ref · valid', validation: 'Passed · 18/18 checks', health: 'Healthy', dependencies: '2 pipelines · 3 datasets', lifecycle: 'Active', operation: 'Observed' },
  'conn-0002': { owner: 'Data Engineering Alpha', credential: 'Service ref · valid', validation: 'Passed · 12/12 checks', health: 'Healthy', dependencies: '1 pipeline · 2 datasets', lifecycle: 'Active', operation: 'In use' },
  'conn-0003': { owner: 'Integration Alpha', credential: 'Vault ref · expiring', validation: 'Stale · 36 days', health: 'Warning', dependencies: 'No active dependency', lifecycle: 'Paused', operation: 'Action needed' },
  'conn-0004': { owner: 'Platform Beta', credential: 'Vault ref · valid', validation: 'Passed · 16/16 checks', health: 'Healthy', dependencies: '2 pipelines · 1 dataset', lifecycle: 'Active', operation: 'Streaming' },
  'conn-0005': { owner: 'Reporting Gamma', credential: 'Vault ref · missing', validation: 'Failed · endpoint', health: 'Critical', dependencies: 'No dependency', lifecycle: 'Review', operation: 'Blocked' },
}

export const pipelineExperience: Record<string, { schedule: string; source: string; destination: string; owner: string; latest: string; duration: string; quality: string; freshness: string; version: string }> = {
  'pipe-0001': { schedule: 'Daily · 02:00 ICT', source: 'Sales JDBC', destination: 'fact_sales_daily', owner: 'Data Engineering Alpha', latest: 'Succeeded · 06/01 02:04', duration: '4m 12s', quality: '98.7% · 24/24', freshness: 'On time · SLA 06:00', version: 'v3 active' },
  'pipe-0002': { schedule: 'Every 5 minutes', source: 'IoT ingest', destination: 'iot_telemetry_1min', owner: 'Platform Beta', latest: 'Running · 06/01 09:55', duration: '3m 08s', quality: '96.2% · 11/12', freshness: 'At risk · 4m lag', version: 'v7 active' },
}

export const datasetExperience: Record<string, { source: string; schema: string; owner: string; steward: string; classification: string; quality: string; lineage: string; freshness: string; retention: string; policy: string; issues: string }> = {
  'ds-0001': { source: 'Sales Daily Ingest', schema: 'analytics.fact_sales_daily', owner: 'Data Engineering Alpha', steward: 'Data Steward Alpha', classification: 'Internal · PII masked', quality: '98.7% · Passed', lineage: '2 sources → 4 transforms', freshness: 'Daily · 4h old', retention: '36 months', policy: 'Workspace readers', issues: 'No blocking issue' },
  'ds-0002': { source: 'IoT Telemetry Rollup', schema: 'telemetry.iot_telemetry_1min', owner: 'Platform Beta', steward: 'Data Steward Beta', classification: 'Internal', quality: '96.2% · 1 warning', lineage: '1 stream → 2 transforms', freshness: '5 minutes · 4m lag', retention: '13 months', policy: 'Approval required', issues: 'Add business description' },
}

export const serviceHealth = [
  { name: 'ProductApi mock', state: 'Healthy', latency: '18 ms', tone: 'success' as const },
  { name: 'Pipeline simulator', state: 'Healthy', latency: '42 ms', tone: 'success' as const },
  { name: 'Catalog fixture', state: 'Healthy', latency: '21 ms', tone: 'success' as const },
  { name: 'Query sandbox', state: 'Degraded', latency: '186 ms', tone: 'warning' as const },
]

export const auditExperience = {
  'audit-0001': { actorName: 'Quản trị viên Tenant (giả lập)', targetName: 'Sales Analytics', service: 'Workspace Control', correlation: 'corr-ba-8f21a1', decision: 'Workspace provisioned' },
  'audit-0002': { actorName: 'Quản trị viên Tenant (giả lập)', targetName: 'Finance storage connection', service: 'Access Policy', correlation: 'corr-ba-4c37b2', decision: 'Rejected: read-only scope' },
} as const
