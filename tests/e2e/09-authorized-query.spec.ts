import { test, expect, gotoAsPersona } from './fixtures'

test('DataEngineer can run a SELECT query and see results', async ({ page }) => {
  await gotoAsPersona(page, 'persona-data-engineer')
  await page.goto('/query')

  await page.getByTestId('query-sql-input').fill('SELECT * FROM fact_sales_daily LIMIT 10')
  await page.getByTestId('run-query-button').click()
  await expect(page.getByTestId('query-results-table')).toBeVisible()
})

test('read-only Analyst is forbidden from running a write statement', async ({ page }) => {
  await gotoAsPersona(page, 'persona-analyst')
  await page.goto('/query')

  await page.getByTestId('query-sql-input').fill('DELETE FROM fact_sales_daily')
  await page.getByTestId('run-query-button').click()

  // Forbidden response surfaces as a toast, not a results table.
  await expect(page.getByTestId('query-results-table')).toHaveCount(0)
  await expect(page.getByText(/read-only|Forbidden|read only/i)).toBeVisible()
})
