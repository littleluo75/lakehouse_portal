import { test, expect, gotoAsPersona } from './fixtures'

test('publishing a draft dataset registers it in the catalog', async ({ page }) => {
  // ds-0002 belongs to ws-0002 (Tenant Beta); the default identity starts
  // on ws-0001.
  await gotoAsPersona(page, 'persona-data-engineer', 'ws-0002')
  await page.goto('/datasets')
  const row = page.getByTestId('dataset-row-ds-0002')
  await expect(row).toContainText('draft')

  await page.getByTestId('publish-dataset-ds-0002').click()
  await expect(row).toContainText('published')
  await expect(row).toContainText('Có') // catalogRegistered = true

  await page.goto('/catalog')
  await expect(page.getByTestId('catalog-table')).toContainText('iot_telemetry_1min')
})
