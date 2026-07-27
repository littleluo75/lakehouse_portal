# BA Draft local preview

The redesigned BA Draft is a deterministic, mock-only evaluation surface.

From `vdp-portal`:

```powershell
pnpm.cmd dev:ba-draft
```

Open `http://127.0.0.1:3000`. The trusted launcher binds Next.js to loopback and predefines rejected endpoint, credential, and Kubernetes variables as empty so Next cannot import them from `.env.local`. A direct unmanaged `BA_DRAFT_MODE=true` launch remains fail-closed.

Expected persistent marker:

```text
BA DRAFT — MOCK DATA — KHÔNG PHẢI HỆ THỐNG THẬT
```

Stop the foreground preview with `Ctrl+C`. For a background process, use the exact PID reported when it starts:

```powershell
Stop-Process -Id <PID>
```

Validation:

```powershell
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
cd ..
node node_modules/@playwright/test/cli.js test
```

Playwright rejects browser requests to every non-loopback host. Product interactions remain behind `/api/cp/v1`; no real SQL, Kubernetes, object-storage, catalog, Airflow, Grafana, or identity endpoint is contacted.
