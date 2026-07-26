import { test, expect, gotoAsPersona } from './fixtures'

test('TenantAdmin can approve a pending access request', async ({ page }) => {
  await gotoAsPersona(page, 'persona-tenant-admin')
  await page.goto('/access-requests')

  const row = page.getByTestId('access-request-row-ar-0001')
  await expect(row).toContainText('pending')

  await page.getByTestId('approve-access-request-ar-0001').click()
  await expect(row).toContainText('approved')
})

test('rejecting a request records it as rejected and is idempotent', async ({ page }) => {
  await gotoAsPersona(page, 'persona-tenant-admin', 'ws-0001')
  await page.goto('/access-requests')

  await page.getByTestId('reject-access-request-ar-0001').click()
  const row = page.getByTestId('access-request-row-ar-0001')
  await expect(row).toContainText('rejected')
  // Already-decided requests no longer show action buttons.
  await expect(page.getByTestId('approve-access-request-ar-0001')).toHaveCount(0)
})

test('Analyst persona (non-approver) sees no decide actions', async ({ page }) => {
  await gotoAsPersona(page, 'persona-analyst')
  await page.goto('/access-requests')
  await expect(page.getByTestId('approve-access-request-ar-0001')).toHaveCount(0)
  await expect(page.getByTestId('reject-access-request-ar-0001')).toHaveCount(0)
})
