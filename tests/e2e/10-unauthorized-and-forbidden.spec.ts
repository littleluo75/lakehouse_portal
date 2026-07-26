import { test, expect, gotoAsPersona } from './fixtures'

test('a scenario-forced unauthorized query response is surfaced to the user', async ({ page }) => {
  await page.goto('/query')
  const res = await page.request.post('/api/cp/v1/query', { data: { sql: 'SELECT 1', scenario: 'unauthorized' } })
  expect(res.status()).toBe(401)
  const body = await res.json()
  expect(body.code).toBe('SESSION_EXPIRED')
})

test('non-approver persona (Analyst) is redirected away from a role-gated route (/admin)', async ({ page }) => {
  await gotoAsPersona(page, 'persona-analyst')
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/403$/)
})

test('SuperAdmin passes the /admin role gate and sees the deferred-route placeholder', async ({ page }) => {
  await gotoAsPersona(page, 'persona-super-admin')
  await page.goto('/admin')
  await expect(page).not.toHaveURL(/\/403$/)
  // /admin is compatibility-only (P1, deferred) in BA Draft — it must show
  // a bounded placeholder, not a broken/blank page.
  await expect(page.getByTestId('deferred-route-placeholder')).toBeVisible()
})

test('audit log is forbidden for a non-admin persona at the API level', async ({ page }) => {
  await gotoAsPersona(page, 'persona-analyst')
  const res = await page.request.get('/api/cp/v1/audit')
  expect(res.status()).toBe(403)

  await page.goto('/audit')
  await expect(page.getByTestId('error-state')).toBeVisible()
})

test('audit log is visible for TenantAdmin', async ({ page }) => {
  await gotoAsPersona(page, 'persona-tenant-admin')
  await page.goto('/audit')
  await expect(page.getByTestId('audit-table')).toBeVisible()
})
