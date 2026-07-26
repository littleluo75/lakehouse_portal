import { test, expect, assertNoConsoleErrors } from './fixtures'

test('BA Draft banner is present and non-dismissible on the dashboard', async ({ page, consoleErrors }) => {
  await page.goto('/')

  const banner = page.getByTestId('ba-draft-banner')
  await expect(banner).toBeVisible()
  await expect(banner).toHaveText('BA DRAFT — MOCK DATA — KHÔNG PHẢI HỆ THỐNG THẬT')
  await expect(banner.locator('button')).toHaveCount(0) // no dismiss control

  await expect(page.getByTestId('ba-dashboard')).toBeVisible()
  await expect(page.getByTestId('ba-nav')).toBeVisible()

  await assertNoConsoleErrors(consoleErrors)
})

test('banner persists across navigation to another route', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('nav-item-connections').click()
  await expect(page).toHaveURL(/\/connections$/)
  await expect(page.getByTestId('ba-draft-banner')).toBeVisible()
})
