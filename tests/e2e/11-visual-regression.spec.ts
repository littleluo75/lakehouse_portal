import { test, expect, assertNoConsoleErrors } from './fixtures'

test.use({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })

const routes = [
  { name: 'application-shell', route: '/', ready: 'ba-nav' },
  { name: 'dashboard', route: '/', ready: 'ba-dashboard' },
  { name: 'workspace-detail', route: '/workspaces/ws-0001', ready: 'workspace-detail' },
  { name: 'connections', route: '/connections', ready: 'connections-table' },
  { name: 'pipeline-detail', route: '/pipelines/pipe-0001', ready: 'pipeline-detail' },
  { name: 'dag-editor', route: '/pipelines/pipe-0001', ready: 'dag-nodes' },
  { name: 'catalog-detail', route: '/catalog/cat-0001', ready: 'ba-catalog-detail' },
  { name: 'authorized-query', route: '/query', ready: 'ba-query-editor' },
  { name: 'operations-list', route: '/operations', ready: 'operations-table' },
] as const

for (const view of routes) {
  test(`visual baseline: ${view.name}`, async ({ page, consoleErrors }) => {
    await page.goto(view.route)
    await expect(page.getByTestId('ba-draft-banner')).toBeVisible()
    await expect(page.getByTestId(view.ready)).toBeVisible()
    await expect(page).toHaveScreenshot(`${view.name}.png`, {
      fullPage: true,
      animations: 'disabled',
      caret: 'initial',
    })
    await assertNoConsoleErrors(consoleErrors)
  })
}
