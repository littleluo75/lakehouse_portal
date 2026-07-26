import { test, expect } from './fixtures'

test('opening the mapping drawer from a specific node loads that node\'s mapping', async ({ page }) => {
  await page.goto('/pipelines/pipe-0001')
  await expect(page.getByTestId('dag-node-node-merge-01')).toBeVisible()

  await page.getByTestId('open-mapping-node-merge-01').click()

  const drawer = page.getByTestId('mapping-drawer')
  await expect(drawer).toBeVisible()
  await expect(drawer).toContainText('node-merge-01')
  await expect(drawer).toContainText('Merge — Sales + Region lookup')
  await expect(page.getByTestId('mapping-source-0')).toHaveValue('sales.customer_id')
})

test('editing and saving a mapping persists the change', async ({ page }) => {
  await page.goto('/pipelines/pipe-0001')
  await page.getByTestId('open-mapping-node-merge-01').click()

  await page.getByTestId('add-mapping-row').click()
  const rows = page.getByTestId('mapping-rows').locator('.flex')
  const newIndex = (await rows.count()) - 1
  await page.getByTestId(`mapping-source-${newIndex}`).fill('sales.new_field')
  await page.getByTestId(`mapping-dest-${newIndex}`).fill('fact_sales.new_field')
  await page.getByTestId('save-mapping-button').click()

  await expect(page.getByTestId('mapping-drawer')).toHaveCount(0)

  // Re-open and confirm the new row was persisted server-side. Input
  // values aren't part of textContent, so check the field directly.
  await page.getByTestId('open-mapping-node-merge-01').click()
  await expect(page.getByTestId(`mapping-source-${newIndex}`)).toHaveValue('sales.new_field')
  await expect(page.getByTestId(`mapping-dest-${newIndex}`)).toHaveValue('fact_sales.new_field')
})
