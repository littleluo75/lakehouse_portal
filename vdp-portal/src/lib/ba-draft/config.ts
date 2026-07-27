/**
 * BA Draft mode: a mock-only local demo mode that must never contact real
 * VNPT / Kubernetes / database / lakehouse infrastructure.
 *
 * Fail-closed rule: the app only enters BA Draft mode when BA_DRAFT_MODE is
 * the exact string "true". Any other value (unset, "false", "1", a typo)
 * means normal mode — the app never *silently* enters draft mode.
 */

export const BA_DRAFT_BANNER_TEXT = 'BA DRAFT — MOCK DATA — KHÔNG PHẢI HỆ THỐNG THẬT'

export function isBaDraftMode(): boolean {
  return process.env.BA_DRAFT_MODE === 'true'
}

/** Variable name -> human reason, never the value. */
export interface EnvViolation {
  variable: string
  reason: string
}

// Known real internal endpoint / infra-config variables. If BA_DRAFT_MODE is
// on and any of these are populated, the app is likely misconfigured to sit
// in front of a real environment and must refuse to start as BA Draft.
const REJECTED_ENDPOINT_VARS = [
  'KEYCLOAK_ISSUER',
  'KEYCLOAK_INTERNAL_URL',
  'INTERNAL_AIRFLOW_API',
  'INTERNAL_TRINO_URL',
  'INTERNAL_NESSIE_API',
  'INTERNAL_MINIO_ENDPOINT',
  'INTERNAL_OPENMETADATA',
  'INTERNAL_JUPYTERHUB',
  'INTERNAL_GRAFANA',
  'STARROCKS_HOST',
  'NEXTAUTH_URL',
  // Browser-exposed/public tool endpoints are equally unsafe in BA Draft.
  // Keep both legacy PUBLIC_* names and Next.js client-exposed variants so
  // an old Helm value or a new client integration cannot bypass fail-closed
  // startup validation.
  'PUBLIC_AIRFLOW_URL',
  'PUBLIC_TRINO_URL',
  'PUBLIC_GRAFANA_URL',
  'PUBLIC_OPENMETADATA_URL',
  'PUBLIC_JUPYTERHUB_URL',
  'NEXT_PUBLIC_AIRFLOW_URL',
  'NEXT_PUBLIC_TRINO_URL',
  'NEXT_PUBLIC_GRAFANA_URL',
  'NEXT_PUBLIC_OPENMETADATA_URL',
  'NEXT_PUBLIC_JUPYTERHUB_URL',
  'NEXT_PUBLIC_MINIO_URL',
]

const REJECTED_CREDENTIAL_VARS = [
  'KEYCLOAK_CLIENT_SECRET',
  'INTERNAL_MINIO_ACCESS_KEY',
  'INTERNAL_MINIO_SECRET_KEY',
  'STARROCKS_PASSWORD',
  'STARROCKS_USER',
  'GRAFANA_ADMIN_USER',
  'GRAFANA_ADMIN_PASSWORD',
  'INTERNAL_OPENMETADATA_USERNAME',
  'INTERNAL_OPENMETADATA_PASSWORD',
  'AUTH_SECRET',
  'NEXTAUTH_SECRET',
]

const REJECTED_KUBERNETES_VARS = ['KUBERNETES_SERVICE_HOST', 'KUBECONFIG']

function collectPopulated(names: string[], reason: string): EnvViolation[] {
  return names
    .filter((name) => {
      const value = process.env[name]
      return typeof value === 'string' && value.trim().length > 0
    })
    .map((variable) => ({ variable, reason }))
}

/**
 * Pure validation — returns the list of violations without throwing, so it
 * can be unit tested and also used by a startup guard that throws.
 * Never includes variable VALUES, only names, so this is safe to log.
 */
export function findBaDraftEnvironmentViolations(): EnvViolation[] {
  if (!isBaDraftMode()) return []
  return [
    ...collectPopulated(REJECTED_ENDPOINT_VARS, 'known internal endpoint variable must be absent in BA Draft mode'),
    ...collectPopulated(REJECTED_CREDENTIAL_VARS, 'real/tool-admin credential variable must be absent in BA Draft mode'),
    ...collectPopulated(REJECTED_KUBERNETES_VARS, 'Kubernetes configuration must be absent in BA Draft mode'),
  ]
}

export class BaDraftConfigError extends Error {
  constructor(public readonly violations: EnvViolation[]) {
    super(
      `BA Draft mode refused to start: ${violations.length} unsafe environment variable(s) present ` +
        `(${violations.map((v) => v.variable).join(', ')}). Remove them or unset BA_DRAFT_MODE.`
    )
    this.name = 'BaDraftConfigError'
  }
}

/** Throws BaDraftConfigError (fail startup) if BA Draft mode is unsafe to enter. */
export function assertSafeBaDraftEnvironment(): void {
  const violations = findBaDraftEnvironmentViolations()
  if (violations.length > 0) {
    throw new BaDraftConfigError(violations)
  }
}
