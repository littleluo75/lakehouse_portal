import { afterEach, describe, expect, test } from 'vitest'
import { fixtureStore, findConnection } from './store'

describe('fixtureStore', () => {
  afterEach(() => {
    fixtureStore.reset()
  })

  test('starts from deterministic seed data', () => {
    const state = fixtureStore.get()
    expect(state.workspaces).toHaveLength(3)
    expect(state.workspaces[0].id).toBe('ws-0001')
    expect(state.connections).toHaveLength(5)
  })

  test('reset-demo-data restores canonical fixtures after mutation', () => {
    const before = fixtureStore.get()
    expect(before.connections).toHaveLength(5)

    // Simulate a mutation, e.g. a connection delete (DEF-0002 flow).
    const mutated = before.connections.filter((c) => c.id !== 'conn-0001')
    // fixtureStore.get() returns the live object; directly assign to mimic a handler mutation.
    ;(fixtureStore.get() as { connections: unknown }).connections = mutated
    expect(fixtureStore.get().connections).toHaveLength(4)

    fixtureStore.reset()

    expect(fixtureStore.get().connections).toHaveLength(5)
    expect(findConnection('conn-0001')).toBeDefined()
  })

  test('mutating the returned state does not corrupt the seed module (deep clone isolation)', () => {
    const conn = findConnection('conn-0002')!
    conn.status = 'deleting'
    fixtureStore.reset()
    expect(findConnection('conn-0002')!.status).toBe('active')
  })

  test('appendAudit prepends a new audit event with a generated id', () => {
    const before = fixtureStore.get().auditEvents.length
    const record = fixtureStore.appendAudit({
      workspaceId: 'ws-0001',
      actor: 'persona-tenant-admin',
      action: 'connection.delete',
      target: 'conn-0001',
      outcome: 'success',
      at: '2026-01-06T05:00:00.000Z',
    })
    expect(fixtureStore.get().auditEvents.length).toBe(before + 1)
    expect(fixtureStore.get().auditEvents[0].id).toBe(record.id)
  })
})
