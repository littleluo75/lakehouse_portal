import { test, expect } from './fixtures'

test('triggering a pipeline run adds a run to the history with succeeded status', async ({ page }) => {
  await page.goto('/pipelines/pipe-0001')
  await expect(page.getByTestId('pipeline-detail')).toBeVisible()

  const runsBefore = await page.getByTestId('pipeline-runs').locator('div.flex').count()
  await page.getByTestId('trigger-pipeline-run').click()
  await expect(page.getByTestId('pipeline-runs').locator('div.flex')).toHaveCount(runsBefore + 1)
  await expect(page.getByTestId('pipeline-runs')).toContainText('Thành công')
})

test('a failed run can be retried via the API and the new run appears', async ({ page, request }) => {
  await page.goto('/pipelines/pipe-0001')

  const failedRun = await request.post('/api/cp/v1/pipelines/pipe-0001/runs', {
    data: { scenario: 'retry_failure' },
  })
  expect(failedRun.ok()).toBeTruthy()
  const failedBody = await failedRun.json()
  expect(failedBody.status).toBe('failed')

  const retryRun = await request.post('/api/cp/v1/pipelines/pipe-0001/runs', {
    data: { scenario: 'retry_success', retryOfRunId: failedBody.id },
  })
  const retryBody = await retryRun.json()
  expect(retryBody.status).toBe('succeeded')
  expect(retryBody.retryOfRunId).toBe(failedBody.id)
})
