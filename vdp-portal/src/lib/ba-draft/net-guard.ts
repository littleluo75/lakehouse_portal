import { isBaDraftMode } from './config'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0'])

export class BaDraftNetworkViolationError extends Error {
  constructor(public readonly hostname: string) {
    super(`BA Draft mode blocked a non-loopback outbound request to host "${hostname}"`)
    this.name = 'BaDraftNetworkViolationError'
  }
}

function extractHostname(input: string | URL | Request): string {
  try {
    if (input instanceof Request) return new URL(input.url).hostname
    return new URL(input.toString()).hostname
  } catch {
    // Relative URL (e.g. "/api/cp/v1/x") — resolved against same origin, always loopback-safe.
    return 'localhost'
  }
}

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase())
}

/** Throws BaDraftNetworkViolationError if the target is not a loopback host. */
export function assertLoopbackTarget(input: string | URL | Request): void {
  const hostname = extractHostname(input)
  if (!isLoopbackHostname(hostname)) {
    throw new BaDraftNetworkViolationError(hostname)
  }
}

let installed = false

/**
 * Monkey-patches globalThis.fetch so that in BA Draft mode, any outbound
 * request to a non-loopback host is rejected before it leaves the process.
 * This is defense-in-depth behind the mock-only route design: even if a
 * legacy handler or a future bug tried to reach a real service, this guard
 * stops it. Logging is sanitized — method + hostname only, never full
 * URL/query/headers/body, which could carry tokens or PII.
 */
export function installServerNetworkGuard(): void {
  if (installed || !isBaDraftMode()) return
  installed = true

  const originalFetch = globalThis.fetch.bind(globalThis)
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const target = input instanceof Request ? input : (input as string | URL)
    const hostname = extractHostname(target)
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
    if (!isLoopbackHostname(hostname)) {
      console.warn(`[ba-draft][net-guard] blocked ${method} request to non-loopback host="${hostname}"`)
      throw new BaDraftNetworkViolationError(hostname)
    }
    return originalFetch(input as RequestInfo, init)
  }) as typeof fetch
}

/** Test-only: allows resetting the "installed" guard between test runs. */
export function _resetNetworkGuardForTests(): void {
  installed = false
}
