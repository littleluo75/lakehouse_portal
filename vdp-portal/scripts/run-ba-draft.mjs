#!/usr/bin/env node
// Cross-platform launcher for the *:ba-draft package.json scripts. Sets
// BA_DRAFT_MODE=true on the child process's environment directly instead of
// relying on shell-specific env-var syntax (which differs between
// PowerShell/cmd.exe and POSIX shells) or Node's --env-file flag (which
// breaks Turbopack's worker-thread spawn with
// "ERR_WORKER_INVALID_EXEC_ARGV" as of Next 16 / Node 24).
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const mode = process.argv[2]
if (!['dev', 'build', 'start'].includes(mode)) {
  console.error('Usage: node scripts/run-ba-draft.mjs <dev|build|start>')
  process.exit(1)
}

const projectRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..')
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next')

// BA Draft must default to loopback only, never LAN — WP-006B explicitly
// defers LAN access to a later work package. `build` has no server to bind.
const args = mode === 'build' ? [nextBin, mode] : [nextBin, mode, '-H', '127.0.0.1']

// Next loads .env.local before next.config.ts. Predefining rejected keys as
// empty prevents dotenv from importing repository-local real/tool settings
// into the BA child process. An unmanaged BA_DRAFT_MODE=true launch does not
// receive this sanitization and still fails closed in next.config.ts.
const rejectedBaEnvironmentKeys = [
  'KEYCLOAK_ISSUER', 'KEYCLOAK_INTERNAL_URL', 'INTERNAL_AIRFLOW_API',
  'INTERNAL_TRINO_URL', 'INTERNAL_NESSIE_API', 'INTERNAL_MINIO_ENDPOINT',
  'INTERNAL_OPENMETADATA', 'INTERNAL_JUPYTERHUB', 'INTERNAL_GRAFANA',
  'STARROCKS_HOST', 'NEXTAUTH_URL', 'PUBLIC_AIRFLOW_URL', 'PUBLIC_TRINO_URL',
  'PUBLIC_GRAFANA_URL', 'PUBLIC_OPENMETADATA_URL', 'PUBLIC_JUPYTERHUB_URL',
  'NEXT_PUBLIC_AIRFLOW_URL', 'NEXT_PUBLIC_TRINO_URL', 'NEXT_PUBLIC_GRAFANA_URL',
  'NEXT_PUBLIC_OPENMETADATA_URL', 'NEXT_PUBLIC_JUPYTERHUB_URL', 'NEXT_PUBLIC_MINIO_URL',
  'KEYCLOAK_CLIENT_SECRET', 'INTERNAL_MINIO_ACCESS_KEY', 'INTERNAL_MINIO_SECRET_KEY',
  'STARROCKS_PASSWORD', 'STARROCKS_USER', 'GRAFANA_ADMIN_USER', 'GRAFANA_ADMIN_PASSWORD',
  'INTERNAL_OPENMETADATA_USERNAME', 'INTERNAL_OPENMETADATA_PASSWORD', 'AUTH_SECRET',
  'NEXTAUTH_SECRET', 'KUBERNETES_SERVICE_HOST', 'KUBECONFIG',
]
const childEnvironment = { ...process.env, BA_DRAFT_MODE: 'true' }
for (const key of rejectedBaEnvironmentKeys) childEnvironment[key] = ''

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  cwd: projectRoot,
  env: childEnvironment,
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
