#!/usr/bin/env node
// Cross-platform launcher for the *:ba-draft package.json scripts. Sets
// BA_DRAFT_MODE=true on the child process's environment directly instead of
// relying on shell-specific env-var syntax (which differs between
// PowerShell/cmd.exe and POSIX shells) or Node's --env-file flag (which
// breaks Turbopack's worker-thread spawn with
// "ERR_WORKER_INVALID_EXEC_ARGV" as of Next 16 / Node 24).
import { spawnSync } from 'node:child_process'
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

const result = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  cwd: projectRoot,
  env: { ...process.env, BA_DRAFT_MODE: 'true' },
})

process.exit(result.status ?? 1)
