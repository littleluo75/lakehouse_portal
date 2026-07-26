import { createInternalClient } from '@/lib/internal-client'
import { lazyClient } from '@/lib/lazy-client'

// Each client is built lazily (on first call) rather than at module load,
// so importing this module never reads credential env vars into a
// constructed client. See lazy-client.ts.

export const airflowClient = lazyClient(() =>
  createInternalClient({
    baseUrl: process.env.INTERNAL_AIRFLOW_API!,
    authType: 'bearer',
  })
)

export const trinoClient = lazyClient(() =>
  createInternalClient({
    baseUrl: process.env.INTERNAL_TRINO_URL!,
    authType: 'none',
  })
)

export const nessieClient = lazyClient(() =>
  createInternalClient({
    baseUrl: process.env.INTERNAL_NESSIE_API!,
    authType: 'none',
  })
)

export const openmetadataClient = lazyClient(() =>
  createInternalClient({
    baseUrl: process.env.INTERNAL_OPENMETADATA!,
    authType: 'basic',
    basicCredentials: {
      username: process.env.INTERNAL_OPENMETADATA_USERNAME || 'admin',
      password: process.env.INTERNAL_OPENMETADATA_PASSWORD || 'admin',
    },
    // TODO: sau khi enable OIDC cho OpenMetadata → đổi sang bearer
  })
)

export const jupyterhubClient = lazyClient(() =>
  createInternalClient({
    baseUrl: process.env.INTERNAL_JUPYTERHUB!,
    authType: 'bearer',
  })
)

export const grafanaClient = lazyClient(() =>
  createInternalClient({
    baseUrl: process.env.INTERNAL_GRAFANA!,
    authType: 'basic',
    basicCredentials: {
      username: process.env.GRAFANA_ADMIN_USER || 'admin',
      password: process.env.GRAFANA_ADMIN_PASSWORD || 'password',
    },
  })
)
