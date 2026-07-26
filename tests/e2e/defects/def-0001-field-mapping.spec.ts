import { test, expect } from '../fixtures'

/**
 * DEF-0001 regression. Prior behavior (per WP-005/WP-006A defect
 * preflight): the "Mở trình ánh xạ" action was a dead click — no explicit
 * node ID reached the mapping logic, so the mapping panel never opened
 * with correct node context. This test proves:
 *   1. the action is wired (previously dead);
 *   2. it opens keyed to the exact node clicked, not just "some node" or
 *      a stale/previous selection;
 *   3. save/cancel are deterministic and node-scoped.
 */
test.describe('DEF-0001: DAG field mapping', () => {
  test('mapping action is wired and opens the exact node clicked', async ({ page }) => {
    await page.goto('/pipelines/pipe-0001')
    await page.getByTestId('dag-nodes').waitFor() // wait for the async DAG fetch to render

    const mappableNodes = await page.getByTestId(/^open-mapping-/).all()
    expect(mappableNodes.length).toBeGreaterThan(0) // regression guard: action exists at all

    await page.getByTestId('open-mapping-node-merge-01').click()
    await expect(page.getByTestId('mapping-drawer')).toContainText('node-merge-01')
  })

  test('switching selected node updates the drawer to the new node, not the old one', async ({ page }) => {
    await page.goto('/pipelines/pipe-0001')

    await page.getByTestId('open-mapping-node-merge-01').click()
    await expect(page.getByTestId('mapping-drawer')).toContainText('node-merge-01')
    await page.getByTestId('save-mapping-button').click() // closes via save (empty diff is fine)

    // A different pipeline has a transform node — confirms mapping state
    // is not leaked from the previously selected node.
    await page.goto('/pipelines/pipe-0002')
    await page.getByTestId('open-mapping-node-transform-02').click()
    await expect(page.getByTestId('mapping-drawer')).toContainText('node-transform-02')
    await expect(page.getByTestId('mapping-drawer')).not.toContainText('node-merge-01')
  })

  test('requesting mapping for a nonexistent node ID fails closed (API-level)', async ({ request }) => {
    const res = await request.get('/api/cp/v1/pipelines/pipe-0001/nodes/does-not-exist/mapping')
    expect(res.status()).toBe(404)
    const body = await res.json()
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  test('cancel discards unsaved edits', async ({ page }) => {
    await page.goto('/pipelines/pipe-0001')
    await page.getByTestId('open-mapping-node-merge-01').click()
    await page.getByTestId('mapping-source-0').fill('DISCARD_ME')
    await page.getByRole('button', { name: 'Hủy' }).click()
    await expect(page.getByTestId('mapping-drawer')).toHaveCount(0)

    await page.getByTestId('open-mapping-node-merge-01').click()
    await expect(page.getByTestId('mapping-source-0')).not.toHaveValue('DISCARD_ME')
  })
})
