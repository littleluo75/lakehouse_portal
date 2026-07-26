import { test, expect } from './fixtures'

test('validate a connection updates its status and last-validated time', async ({ page }) => {
  await page.goto('/connections')
  const row = page.getByTestId('connection-row-conn-0003') // seeded "paused"
  await expect(row).toContainText('paused')

  await page.getByTestId('validate-connection-conn-0003').click()
  await expect(row).toContainText('active')
})

test('delete is disabled for an in-use connection and works for an idle one', async ({ page }) => {
  await page.goto('/connections')

  // conn-0002 is seeded in-use — delete must be disabled, not merely hidden.
  const disabled = page.getByTestId('delete-connection-disabled-conn-0002')
  await expect(disabled).toBeVisible()
  await expect(disabled).toBeDisabled()

  // conn-0003 is idle — delete should work end-to-end with confirmation.
  await page.getByTestId('delete-connection-button-conn-0003').click()
  await expect(page.getByTestId('confirm-delete-connection-conn-0003')).toBeVisible()
  await page.getByTestId('confirm-delete-connection-conn-0003').click()
  await expect(page.getByTestId('connection-row-conn-0003')).toHaveCount(0)
})

test('cancelling the delete confirmation keeps the connection', async ({ page }) => {
  await page.goto('/connections')
  await page.getByTestId('delete-connection-button-conn-0001').click()
  await page.getByRole('button', { name: 'Hủy' }).click()
  await expect(page.getByTestId('connection-row-conn-0001')).toBeVisible()
})
