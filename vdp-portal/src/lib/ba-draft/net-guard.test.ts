import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  isLoopbackHostname,
  assertLoopbackTarget,
  BaDraftNetworkViolationError,
  installServerNetworkGuard,
  _resetNetworkGuardForTests,
} from './net-guard'

describe('isLoopbackHostname', () => {
  test.each(['localhost', '127.0.0.1', '::1', '0.0.0.0'])('%s is loopback', (host) => {
    expect(isLoopbackHostname(host)).toBe(true)
  })

  test.each(['airflow.lakehouse.local', 'evil.example.com', '10.0.0.5', 'trino.trino.svc.cluster.local'])(
    '%s is not loopback',
    (host) => {
      expect(isLoopbackHostname(host)).toBe(false)
    }
  )
})

describe('assertLoopbackTarget', () => {
  test('allows loopback absolute URL', () => {
    expect(() => assertLoopbackTarget('http://localhost:3000/api/cp/v1/workspaces')).not.toThrow()
  })

  test('allows relative same-origin path', () => {
    expect(() => assertLoopbackTarget('/api/cp/v1/workspaces')).not.toThrow()
  })

  test('rejects non-loopback absolute URL', () => {
    expect(() => assertLoopbackTarget('http://airflow.lakehouse.local:8080/dags')).toThrow(
      BaDraftNetworkViolationError
    )
  })
})

describe('installServerNetworkGuard', () => {
  const originalFetch = globalThis.fetch
  const originalEnv = process.env.BA_DRAFT_MODE

  beforeEach(() => {
    _resetNetworkGuardForTests()
    globalThis.fetch = originalFetch
  })

  afterEach(() => {
    _resetNetworkGuardForTests()
    globalThis.fetch = originalFetch
    if (originalEnv === undefined) delete process.env.BA_DRAFT_MODE
    else process.env.BA_DRAFT_MODE = originalEnv
  })

  test('does nothing outside BA Draft mode', () => {
    delete process.env.BA_DRAFT_MODE
    installServerNetworkGuard()
    expect(globalThis.fetch).toBe(originalFetch)
  })

  test('blocks a fetch to a non-loopback host in BA Draft mode', async () => {
    process.env.BA_DRAFT_MODE = 'true'
    installServerNetworkGuard()
    await expect(fetch('http://airflow.lakehouse.local:8080/dags')).rejects.toThrow(
      BaDraftNetworkViolationError
    )
  })
})
