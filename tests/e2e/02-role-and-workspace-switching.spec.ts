import { test, expect } from './fixtures'

test('switching persona updates the displayed identity and nav visibility', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('persona-switcher')).toContainText('SuperAdmin')

  await page.getByTestId('persona-switcher').click()
  await page.getByTestId('persona-option-persona-analyst').click()
  await expect(page.getByTestId('persona-switcher')).toContainText('Analyst')

  // Analyst role does not see the admin nav item.
  await expect(page.getByTestId('nav-item-admin')).toHaveCount(0)
})

test('switching workspace updates the displayed workspace everywhere', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('workspace-switcher')).toContainText('Tenant Alpha')

  await page.getByTestId('workspace-switcher').click()
  await page.getByTestId('workspace-option-ws-0002').click()
  await expect(page.getByTestId('workspace-switcher')).toContainText('Tenant Beta')

  await expect(page.getByTestId('ba-dashboard')).toContainText('Tenant Beta')
})
