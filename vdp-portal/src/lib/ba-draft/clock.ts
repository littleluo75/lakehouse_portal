/**
 * Deterministic clock + ID generation for BA Draft mock data, so fixture
 * state, scenario tests and screenshots are reproducible run to run instead
 * of depending on Date.now()/Math.random().
 */

const EPOCH_MS = Date.UTC(2026, 0, 6, 2, 0, 0) // fixed reference instant

let virtualOffsetMs = 0
let counters: Record<string, number> = {}

export function now(): Date {
  return new Date(EPOCH_MS + virtualOffsetMs)
}

export function isoNow(): string {
  return now().toISOString()
}

/** Advances the virtual clock, used by scenarios that simulate elapsed time (e.g. stale status). */
export function advanceClock(ms: number): void {
  virtualOffsetMs += ms
}

/** Deterministic, prefix-scoped, monotonically increasing ID — e.g. nextId('ws') -> "ws-0001". */
export function nextId(prefix: string): string {
  const current = (counters[prefix] ?? 0) + 1
  counters[prefix] = current
  return `${prefix}-${String(current).padStart(4, '0')}`
}

/**
 * Advances a prefix's counter so the next nextId() call continues past
 * already-seeded literal IDs (e.g. seed data hardcodes "conn-0001".."conn-0005",
 * so newly-created connections must start at "conn-0006", not collide back
 * at "conn-0001"). Only raises the counter, never lowers it.
 */
export function seedCounter(prefix: string, seededCount: number): void {
  counters[prefix] = Math.max(counters[prefix] ?? 0, seededCount)
}

/** Resets clock offset and all ID counters — called by reset-demo-data. */
export function resetClock(): void {
  virtualOffsetMs = 0
  counters = {}
}
