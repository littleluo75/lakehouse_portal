export async function register() {
  // Validate BA Draft mode before anything else touches env-derived config
  // (Auth.js/Keycloak, service clients, K8s). This must run before the
  // .env.company.local loader below so a misconfigured BA Draft run fails
  // startup instead of silently picking up real credentials.
  const { isBaDraftMode, assertSafeBaDraftEnvironment } = await import('@/lib/ba-draft/config')
  if (isBaDraftMode()) {
    assertSafeBaDraftEnvironment()
    const { installServerNetworkGuard } = await import('@/lib/ba-draft/net-guard')
    installServerNetworkGuard()
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (!isBaDraftMode()) {
      const fs = await import('fs')
      const path = await import('path')
      const envPath = path.resolve(process.cwd(), '.env.company.local')
      if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8')
        envConfig.split('\n').forEach((line) => {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const idx = trimmed.indexOf('=')
            const key = trimmed.slice(0, idx).trim()
            let value = trimmed.slice(idx + 1).trim()
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1)
            }
            process.env[key] = value
          }
        })
      }
    }
  }
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
}
