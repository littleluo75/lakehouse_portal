import { describe, expect, test, vi } from 'vitest'
import { lazyClient } from './lazy-client'

describe('lazyClient', () => {
  test('does not call the factory until a property is accessed', () => {
    const factory = vi.fn(() => ({ ping: () => 'pong' }))
    const client = lazyClient(factory)
    expect(factory).not.toHaveBeenCalled()

    expect(client.ping()).toBe('pong')
    expect(factory).toHaveBeenCalledTimes(1)
  })

  test('caches the constructed instance across repeated access', () => {
    const factory = vi.fn(() => ({ value: Math.random() }))
    const client = lazyClient(factory)
    const first = client.value
    const second = client.value
    expect(first).toBe(second)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  test('supports callable factories (e.g. createInternalClient-style request functions)', () => {
    let constructed = false
    const client = lazyClient(() => {
      constructed = true
      return ((a: number, b: number) => a + b) as unknown as { (a: number, b: number): number }
    })
    expect(constructed).toBe(false)
    expect(client(2, 3)).toBe(5)
    expect(constructed).toBe(true)
  })
})

describe('src/lib/services/k8s.ts import safety', () => {
  test('importing the module never constructs a KubeConfig (regression for BA Draft mode)', async () => {
    const loadFromCluster = vi.fn()
    const loadFromDefault = vi.fn()
    const makeApiClient = vi.fn(() => ({}))

    class MockKubeConfig {
      loadFromCluster = loadFromCluster
      loadFromDefault = loadFromDefault
      makeApiClient = makeApiClient
    }

    vi.doMock('@kubernetes/client-node', () => ({
      KubeConfig: MockKubeConfig,
      CustomObjectsApi: class {},
      CoreV1Api: class {},
    }))

    const k8sModule = await import('./services/k8s')

    expect(loadFromCluster).not.toHaveBeenCalled()
    expect(loadFromDefault).not.toHaveBeenCalled()
    expect(makeApiClient).not.toHaveBeenCalled()

    // Only actually invoking a function that uses the client triggers construction.
    await k8sModule.listVolcanoQueues()
    expect(makeApiClient).toHaveBeenCalled()

    vi.doUnmock('@kubernetes/client-node')
    vi.resetModules()
  })
})
