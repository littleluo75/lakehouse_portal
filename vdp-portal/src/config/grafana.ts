// Panel IDs must be populated by querying the Grafana API at:
// GET /api/search?type=dash-db and then GET /api/dashboards/uid/{uid}
// Until the cluster is reachable, these are left as 0 / 'FILL_FROM_API'.
export const GRAFANA_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_GRAFANA_URL ?? 'https://grafana.lakehouse.local',
  internalUrl: process.env.INTERNAL_GRAFANA ?? 'http://kube-prometheus-stack-grafana.monitoring.svc.cluster.local:80',
  adminUser: process.env.GRAFANA_ADMIN_USER ?? '',
  adminPassword: process.env.GRAFANA_ADMIN_PASSWORD ?? '',
  dashboards: {
    lakehouse: {
      uid: process.env.GRAFANA_DASHBOARD_UID ?? 'FILL_FROM_API',
      panels: {
        cpuUsage: parseInt(process.env.GRAFANA_PANEL_CPU ?? '0'),
        memoryUsage: parseInt(process.env.GRAFANA_PANEL_MEMORY ?? '0'),
        sparkJobs: parseInt(process.env.GRAFANA_PANEL_SPARK ?? '0'),
        airflowHealth: parseInt(process.env.GRAFANA_PANEL_AIRFLOW ?? '0'),
        storageUsage: parseInt(process.env.GRAFANA_PANEL_STORAGE ?? '0'),
        networkIO: parseInt(process.env.GRAFANA_PANEL_NETWORK ?? '0'),
      },
    },
  },
} as const
