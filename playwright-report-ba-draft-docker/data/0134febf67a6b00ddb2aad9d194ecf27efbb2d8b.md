# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 11-visual-regression.spec.ts >> visual baseline: application-shell
- Location: tests\e2e\11-visual-regression.spec.ts:18:7

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  100 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: application-shell.png

Call log:
  - Expect "toHaveScreenshot(application-shell.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 100 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 100 pixels (ratio 0.01 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - status [ref=e2]: BA DRAFT — MOCK DATA — KHÔNG PHẢI HỆ THỐNG THẬT
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e6]: VD
        - generic [ref=e7]:
          - strong [ref=e8]: VNPT Data Cloud
          - generic [ref=e9]: Enterprise Data Platform
      - generic [ref=e10]:
        - generic [ref=e11]: Environment
        - strong [ref=e12]: BA EVALUATION · LOCAL
      - navigation [ref=e13]:
        - generic [ref=e14]:
          - generic [ref=e15]: Overview
          - link "Tổng quan" [ref=e16] [cursor=pointer]:
            - /url: /
            - img [ref=e17]
            - text: Tổng quan
        - generic [ref=e22]:
          - generic [ref=e23]: Workspaces
          - link "Workspaces" [ref=e24] [cursor=pointer]:
            - /url: /workspaces
            - img [ref=e25]
            - text: Workspaces
        - generic [ref=e27]:
          - generic [ref=e28]: Data Sources
          - link "Connections" [ref=e29] [cursor=pointer]:
            - /url: /connections
            - img [ref=e30]
            - text: Connections
        - generic [ref=e34]:
          - generic [ref=e35]: Data Flows
          - link "Pipelines" [ref=e36] [cursor=pointer]:
            - /url: /pipelines
            - img [ref=e37]
            - text: Pipelines
          - link "Dataset publication" [ref=e41] [cursor=pointer]:
            - /url: /datasets
            - img [ref=e42]
            - text: Dataset publication
        - generic [ref=e46]:
          - generic [ref=e47]: Catalog & Governance
          - link "Data Catalog" [ref=e48] [cursor=pointer]:
            - /url: /catalog
            - img [ref=e49]
            - text: Data Catalog
          - link "Access & approvals" [ref=e51] [cursor=pointer]:
            - /url: /access-requests
            - img [ref=e52]
            - text: Access & approvals
        - generic [ref=e55]:
          - generic [ref=e56]: Query & Consumption
          - link "Authorized Query" [ref=e57] [cursor=pointer]:
            - /url: /query
            - img [ref=e58]
            - text: Authorized Query
        - generic [ref=e62]:
          - generic [ref=e63]: Operations
          - link "Operations" [ref=e64] [cursor=pointer]:
            - /url: /operations
            - img [ref=e65]
            - text: Operations
          - link "Audit" [ref=e67] [cursor=pointer]:
            - /url: /audit
            - img [ref=e68]
            - text: Audit
        - generic [ref=e71]:
          - generic [ref=e72]: Administration
          - link "Quản trị" [ref=e73] [cursor=pointer]:
            - /url: /admin
            - img [ref=e74]
            - text: Quản trị
      - generic [ref=e77]:
        - img [ref=e78]
        - generic [ref=e81]:
          - strong [ref=e82]: Mock boundary active
          - generic [ref=e83]: /api/cp/v1 only
    - banner [ref=e84]:
      - generic [ref=e85]:
        - link "Data Platform" [ref=e87] [cursor=pointer]:
          - /url: /
        - generic [ref=e88]:
          - img [ref=e89]
          - textbox "Tìm kiếm toàn cục" [ref=e92]:
            - /placeholder: Tìm dataset, pipeline, operation…
          - generic [ref=e93]: ⌘ K
      - generic [ref=e94]:
        - generic [ref=e95]:
          - img [ref=e96]
          - generic [ref=e99]:
            - strong [ref=e100]: Platform healthy
            - generic [ref=e101]: 4/5 services
        - button "Thông báo" [ref=e102]:
          - img [ref=e103]
          - generic [ref=e106]: "3"
        - button "Reset demo data" [ref=e107]:
          - img
          - text: Reset demo data
        - button "Tenant Alpha — Sales Analytics" [ref=e108]:
          - img [ref=e109]
          - generic [ref=e111]: Tenant Alpha — Sales Analytics
        - button "Nguyễn Văn Super (SuperAdmin)" [ref=e112]:
          - img [ref=e113]
          - generic [ref=e117]: Nguyễn Văn Super
          - generic [ref=e118]: (SuperAdmin)
    - main [ref=e119]:
      - generic [ref=e121]:
        - generic [ref=e122]:
          - generic [ref=e123]:
            - generic [ref=e124]: Workspace command center · ALPHA
            - heading "Tenant Alpha — Sales Analytics" [level=1] [ref=e125]
            - paragraph [ref=e126]: Tình trạng tài nguyên, luồng dữ liệu, yêu cầu truy cập và hoạt động vận hành trong một ngữ cảnh đánh giá thống nhất.
          - button "Open workspace" [ref=e128]:
            - text: Open workspace
            - img
        - generic [ref=e129]:
          - generic [ref=e130]:
            - generic [ref=e131]:
              - generic [ref=e132]: Connections
              - img [ref=e133]
            - strong [ref=e137]: "3"
            - generic [ref=e138]: 2 healthy · 1 stale
          - generic [ref=e139]:
            - generic [ref=e141]: Pipelines
            - strong [ref=e142]: "1"
            - generic [ref=e143]: 0 running · SLA 96%
          - generic [ref=e144]:
            - generic [ref=e146]: Published datasets
            - strong [ref=e147]: "1"
            - generic [ref=e148]: 1 quality warning
          - generic [ref=e149]:
            - generic [ref=e151]: Query activity
            - strong [ref=e152]: "148"
            - generic [ref=e153]: 24h · 0 write attempts
          - generic [ref=e154]:
            - generic [ref=e155]:
              - generic [ref=e156]: Pending approvals
              - img [ref=e157]
            - strong [ref=e160]: "1"
            - generic [ref=e161]: Oldest 2h 18m
          - generic [ref=e162]:
            - generic [ref=e163]:
              - generic [ref=e164]: Failed operations
              - img [ref=e165]
            - strong [ref=e167]: "0"
            - generic [ref=e168]: Requires owner review
        - generic [ref=e169]:
          - generic [ref=e170]:
            - generic [ref=e171]:
              - generic [ref=e172]:
                - heading "Attention queue" [level=2] [ref=e173]
                - paragraph [ref=e174]: Exceptions ranked by business and SLA impact
              - button "View operations" [ref=e175]
            - generic [ref=e176]:
              - generic [ref=e177]:
                - generic [ref=e178]:
                  - strong [ref=e179]: Legacy CRM validation is stale
                  - paragraph [ref=e180]: Connection conn-0003 · last success 36 days ago · owner Integration Alpha
                - generic [ref=e181]: Action needed
              - generic [ref=e182]:
                - generic [ref=e183]:
                  - strong [ref=e184]: Dataset quality threshold near breach
                  - paragraph [ref=e185]: fact_sales_daily · completeness 98.7% · target 99%
                - generic [ref=e186]: Monitor
              - generic [ref=e187]:
                - generic [ref=e188]:
                  - strong [ref=e189]: Access decision waiting
                  - paragraph [ref=e190]: Contributor access · Sales JDBC · policy review required
                - generic [ref=e191]: 2h 18m
          - generic [ref=e192]:
            - generic [ref=e194]:
              - heading "Platform & tool health" [level=2] [ref=e195]
              - paragraph [ref=e196]: Mock services · observed at 10:30 ICT
            - generic [ref=e197]:
              - generic [ref=e198]:
                - generic [ref=e199]:
                  - strong [ref=e200]: ProductApi mock
                  - text: 18 ms
                - generic [ref=e201]: Healthy
              - generic [ref=e202]:
                - generic [ref=e203]:
                  - strong [ref=e204]: Pipeline simulator
                  - text: 42 ms
                - generic [ref=e205]: Healthy
              - generic [ref=e206]:
                - generic [ref=e207]:
                  - strong [ref=e208]: Catalog fixture
                  - text: 21 ms
                - generic [ref=e209]: Healthy
              - generic [ref=e210]:
                - generic [ref=e211]:
                  - strong [ref=e212]: Query sandbox
                  - text: 186 ms
                - generic [ref=e213]: Degraded
        - generic [ref=e214]:
          - generic [ref=e215]:
            - generic [ref=e217]:
              - heading "Recent operational activity" [level=2] [ref=e218]
              - paragraph [ref=e219]: Deterministic audit-linked events from the current workspace
            - generic [ref=e221]:
              - generic [ref=e222]:
                - strong [ref=e223]: connection.validate
                - generic [ref=e224]: op-0001 · corr-ba-0001 · State reconciled
              - generic [ref=e225]: Thành công
          - generic [ref=e226]:
            - generic [ref=e227]:
              - generic [ref=e228]:
                - heading "Quota & capacity" [level=2] [ref=e229]
                - paragraph [ref=e230]: Workspace allocation and forecast
              - img [ref=e231]
            - generic [ref=e234]:
              - generic [ref=e235]:
                - generic [ref=e236]:
                  - generic [ref=e237]: Storage
                  - strong [ref=e238]: 340 / 500 GB
                - generic "68%" [ref=e239]
                - paragraph [ref=e241]: "Forecast: 82% in 30 days at current growth"
              - generic [ref=e242]:
                - generic [ref=e243]:
                  - generic [ref=e244]: Connections
                  - strong [ref=e245]: 3 / 10
                - generic "30%" [ref=e246]
  - region "Notifications alt+T"
  - alert [ref=e248]
```

# Test source

```ts
  1  | import { test, expect, assertNoConsoleErrors } from './fixtures'
  2  | 
  3  | test.use({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  4  | 
  5  | const routes = [
  6  |   { name: 'application-shell', route: '/', ready: 'ba-nav' },
  7  |   { name: 'dashboard', route: '/', ready: 'ba-dashboard' },
  8  |   { name: 'workspace-detail', route: '/workspaces/ws-0001', ready: 'workspace-detail' },
  9  |   { name: 'connections', route: '/connections', ready: 'connections-table' },
  10 |   { name: 'pipeline-detail', route: '/pipelines/pipe-0001', ready: 'pipeline-detail' },
  11 |   { name: 'dag-editor', route: '/pipelines/pipe-0001', ready: 'dag-nodes' },
  12 |   { name: 'catalog-detail', route: '/catalog/cat-0001', ready: 'ba-catalog-detail' },
  13 |   { name: 'authorized-query', route: '/query', ready: 'ba-query-editor' },
  14 |   { name: 'operations-list', route: '/operations', ready: 'operations-table' },
  15 | ] as const
  16 | 
  17 | for (const view of routes) {
  18 |   test(`visual baseline: ${view.name}`, async ({ page, consoleErrors }) => {
  19 |     await page.goto(view.route)
  20 |     await expect(page.getByTestId('ba-draft-banner')).toBeVisible()
  21 |     await expect(page.getByTestId(view.ready)).toBeVisible()
> 22 |     await expect(page).toHaveScreenshot(`${view.name}.png`, {
     |                        ^ Error: expect(page).toHaveScreenshot(expected) failed
  23 |       fullPage: true,
  24 |       animations: 'disabled',
  25 |       caret: 'initial',
  26 |     })
  27 |     await assertNoConsoleErrors(consoleErrors)
  28 |   })
  29 | }
  30 | 
```