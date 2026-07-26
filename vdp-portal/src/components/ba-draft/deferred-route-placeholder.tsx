import { Info } from 'lucide-react'

/**
 * Shown in BA Draft mode for routes explicitly deferred out of WP-006B
 * scope (compatibility-only legacy tool pages: admin user/role management,
 * workflows, jobs, notebooks, storage, streams, observability). These
 * pages are real in normal mode (backed by Keycloak/Airflow/Spark/etc.)
 * but must never be reachable through BA Draft's mock-only boundary, and
 * must never silently crash — see
 * Report/.../14-OPEN-GAPS-AND-DEFERRED-ROUTES.csv for the full list and
 * rationale.
 */
export function DeferredRoutePlaceholder({ title, note }: { title: string; note?: string }) {
  return (
    <div
      data-testid="deferred-route-placeholder"
      className="flex flex-col items-center justify-center h-64 gap-3 text-center border rounded-lg bg-slate-50"
    >
      <Info className="w-8 h-8 text-slate-400" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-slate-500 max-w-md">
        Chức năng này chưa nằm trong phạm vi BA Draft (WP-006B). Trong chế độ thật, trang này kết nối tới hạ tầng
        thật (Keycloak/Airflow/Spark/JupyterHub/MinIO/Grafana) và không được mô phỏng ở đây.
        {note ? ` ${note}` : ''}
      </p>
    </div>
  )
}
