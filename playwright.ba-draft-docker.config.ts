import { defineConfig, devices } from '@playwright/test'

/**
 * WP-006D: runs the existing BA Draft E2E suite against the Docker LAN
 * HTTPS deployment (Caddy edge -> portal container) instead of spawning a
 * native dev server. The Caddy internal root CA must already be trusted in
 * Cert:\CurrentUser\Root (see vdp-portal/scripts/Install-BaDraftLocalCA.ps1)
 * so this relies on real certificate validation, not ignoreHTTPSErrors.
 *
 *   npx playwright test --config=playwright.ba-draft-docker.config.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-ba-draft-docker', open: 'never' }],
    ['json', { outputFile: 'test-results/results-ba-draft-docker.json' }],
  ],
  outputDir: 'test-results/artifacts-ba-draft-docker',
  use: {
    baseURL: 'https://localhost/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
