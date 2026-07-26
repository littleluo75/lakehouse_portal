import { test, expect, gotoAsPersona } from '../fixtures'

/**
 * DEF-0002 regression. Prior behavior: no connection domain existed at
 * all in the portal, so "delete" was unreachable — no visible control, no
 * handler, no API. This test proves:
 *   1. a visible delete control exists and is role-guarded;
 *   2. it is blocked (not just hidden) for an in-use connection;
 *   3. it succeeds for an idle connection, with confirmation and an
 *      audit trail.
 */
test.describe('DEF-0002: connection delete', () => {
  test('delete control is visible and wired for an authorized role', async ({ page }) => {
    await page.goto('/connections')
    const button = page.getByTestId('delete-connection-button-conn-0001')
    await expect(button).toBeVisible() // regression guard: control exists at all
    await button.click()
    await expect(page.getByTestId('confirm-delete-connection-conn-0001')).toBeVisible()
  })

  test('delete is absent for a read-only role (PIIReader)', async ({ page }) => {
    await gotoAsPersona(page, 'persona-pii-reader')
    await page.goto('/connections')
    await expect(page.getByTestId('delete-connection-button-conn-0001')).toHaveCount(0)
    await expect(page.getByTestId('delete-connection-disabled-conn-0001')).toHaveCount(0)
  })

  test('in-use guard blocks delete via both UI and API', async ({ page, request }) => {
    await page.goto('/connections')
    await expect(page.getByTestId('delete-connection-disabled-conn-0002')).toBeDisabled()

    const res = await request.delete('/api/cp/v1/connections/conn-0002')
    expect(res.status()).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('CONNECTION_IN_USE')
  })

  test('successful delete removes the connection and records an audit event', async ({ page }) => {
    await gotoAsPersona(page, 'persona-tenant-admin')
    await page.goto('/connections')

    await page.getByTestId('delete-connection-button-conn-0003').click()
    await page.getByTestId('confirm-delete-connection-conn-0003').click()
    await expect(page.getByTestId('connection-row-conn-0003')).toHaveCount(0)

    await page.goto('/audit')
    await expect(page.getByTestId('audit-table')).toContainText('connection.delete')
  })
})
