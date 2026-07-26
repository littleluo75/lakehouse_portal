import { test as base, expect, type Page } from '@playwright/test'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export interface BaFixtures {
  consoleErrors: string[]
  failedRequests: string[]
  resetFixtures: void
}

/**
 * Shared fixture for every BA Draft E2E spec:
 *  - resets the mock fixture store before every test (the server-side
 *    store is a single shared singleton across the whole Playwright run,
 *    so without this, mutations from one spec leak into the next);
 *  - fails the test immediately if the page issues any request to a
 *    non-loopback host (the network-isolation guarantee under test);
 *  - collects console errors and failed requests for evidence/assertions.
 */
export const test = base.extend<BaFixtures>({
  resetFixtures: [
    async ({ request }, use) => {
      await request.post('/api/cp/v1/ba-control/reset')
      await use()
    },
    { auto: true },
  ],

  consoleErrors: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await use(errors)
  },

  failedRequests: async ({ page }, use) => {
    const failed: string[] = []
    page.on('requestfailed', (req) => {
      failed.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText ?? 'unknown error'}`)
    })
    await use(failed)
  },

  page: async ({ page }, use) => {
    page.on('request', (req) => {
      let hostname: string
      try {
        hostname = new URL(req.url()).hostname
      } catch {
        return
      }
      if (req.url().startsWith('data:') || req.url().startsWith('blob:')) return
      if (!LOOPBACK_HOSTS.has(hostname)) {
        throw new Error(
          `Network isolation violation: request to non-loopback host "${hostname}" (${req.url()}). ` +
            `BA Draft mode must only ever contact loopback.`
        )
      }
    })
    await use(page)
  },
})

export { expect }

export async function assertNoConsoleErrors(errors: string[]) {
  expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toEqual([])
}

export async function gotoAsPersona(page: Page, personaId: string, workspaceId?: string) {
  await page.goto('/')
  await page.request.post('/api/cp/v1/ba-control/persona', { data: { personaId } })
  if (workspaceId) {
    await page.request.post('/api/cp/v1/ba-control/workspace', { data: { workspaceId } })
  }
  await page.reload()
}
