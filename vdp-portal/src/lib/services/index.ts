import { createInternalClient } from '@/lib/internal-client'

export const airflowClient = createInternalClient({
  baseUrl: process.env.INTERNAL_AIRFLOW_API!,
  authType: 'bearer',
})

export const trinoClient = createInternalClient({
  baseUrl: process.env.INTERNAL_TRINO_URL!,
  authType: 'none',
})

export const nessieClient = createInternalClient({
  baseUrl: process.env.INTERNAL_NESSIE_API!,
  authType: 'none',
})

export const openmetadataClient = createInternalClient({
  baseUrl: process.env.INTERNAL_OPENMETADATA!,
  authType: 'basic',
  basicCredentials: {
    username: 'admin',
    password: 'admin',
  },
  // TODO: sau khi enable OIDC cho OpenMetadata → đổi sang bearer
})

export const jupyterhubClient = createInternalClient({
  baseUrl: process.env.INTERNAL_JUPYTERHUB!,
  authType: 'bearer',
})

export const grafanaClient = createInternalClient({
  baseUrl: process.env.INTERNAL_GRAFANA!,
  authType: 'basic',
  basicCredentials: {
    username: 'admin',
    password: process.env.GRAFANA_ADMIN_PASSWORD ?? 'GrafanaAdminPass123!',
  },
})
