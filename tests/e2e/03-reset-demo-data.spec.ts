import { test, expect } from './fixtures'

test('reset-demo-data restores a deleted connection', async ({ page }) => {
  await page.goto('/connections')
  await expect(page.getByTestId('connection-row-conn-0001')).toBeVisible()

  await page.getByTestId('delete-connection-button-conn-0001').click()
  await page.getByTestId('confirm-delete-connection-conn-0001').click()
  await expect(page.getByTestId('connection-row-conn-0001')).toHaveCount(0)

  await page.getByTestId('reset-demo-data-button').click()
  await expect(page.getByTestId('connection-row-conn-0001')).toBeVisible()
})
