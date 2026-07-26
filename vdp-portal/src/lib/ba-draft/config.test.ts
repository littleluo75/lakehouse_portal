import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  isBaDraftMode,
  findBaDraftEnvironmentViolations,
  assertSafeBaDraftEnvironment,
  BaDraftConfigError,
} from './config'

const ENV_KEYS = [
  'BA_DRAFT_MODE',
  'KEYCLOAK_ISSUER',
  'KEYCLOAK_CLIENT_SECRET',
  'INTERNAL_MINIO_ENDPOINT',
  'INTERNAL_MINIO_ACCESS_KEY',
  'INTERNAL_MINIO_SECRET_KEY',
  'STARROCKS_HOST',
  'STARROCKS_PASSWORD',
  'KUBERNETES_SERVICE_HOST',
  'KUBECONFIG',
  'INTERNAL_AIRFLOW_API',
  'NEXTAUTH_URL',
  'AUTH_SECRET',
]

let saved: Record<string, string | undefined>

beforeEach(() => {
  saved = {}
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
})

describe('isBaDraftMode — fail closed', () => {
  test('unset -> false', () => {
    expect(isBaDraftMode()).toBe(false)
  })

  test.each(['false', '1', 'TRUE', 'yes', ''])('invalid value %j -> false', (value) => {
    process.env.BA_DRAFT_MODE = value
    expect(isBaDraftMode()).toBe(false)
  })

  test('exact "true" -> true', () => {
    process.env.BA_DRAFT_MODE = 'true'
    expect(isBaDraftMode()).toBe(true)
  })
})

describe('findBaDraftEnvironmentViolations', () => {
  test('normal mode (BA_DRAFT_MODE unset) never reports violations, even with real config present', () => {
    process.env.KEYCLOAK_ISSUER = 'https://keycloak.lakehouse.local/realms/vdp'
    process.env.KEYCLOAK_CLIENT_SECRET = 'super-secret'
    expect(findBaDraftEnvironmentViolations()).toEqual([])
  })

  test('BA Draft mode with clean env -> no violations', () => {
    process.env.BA_DRAFT_MODE = 'true'
    expect(findBaDraftEnvironmentViolations()).toEqual([])
  })

  test('rejects known internal endpoint variables', () => {
    process.env.BA_DRAFT_MODE = 'true'
    process.env.INTERNAL_AIRFLOW_API = 'http://airflow.lakehouse.local:8080'
    process.env.STARROCKS_HOST = 'starrocks.lakehouse.local'
    const violations = findBaDraftEnvironmentViolations()
    const names = violations.map((v) => v.variable)
    expect(names).toContain('INTERNAL_AIRFLOW_API')
    expect(names).toContain('STARROCKS_HOST')
  })

  test('rejects real/tool-admin credential variables', () => {
    process.env.BA_DRAFT_MODE = 'true'
    process.env.KEYCLOAK_CLIENT_SECRET = 'super-secret'
    process.env.INTERNAL_MINIO_ACCESS_KEY = 'AKIA...'
    const violations = findBaDraftEnvironmentViolations()
    expect(violations.map((v) => v.variable)).toEqual(
      expect.arrayContaining(['KEYCLOAK_CLIENT_SECRET', 'INTERNAL_MINIO_ACCESS_KEY'])
    )
  })

  test('rejects Kubernetes configuration', () => {
    process.env.BA_DRAFT_MODE = 'true'
    process.env.KUBERNETES_SERVICE_HOST = '10.0.0.1'
    const violations = findBaDraftEnvironmentViolations()
    expect(violations.map((v) => v.variable)).toContain('KUBERNETES_SERVICE_HOST')
  })

  test('violation objects never carry the secret value, only the variable name', () => {
    process.env.BA_DRAFT_MODE = 'true'
    process.env.KEYCLOAK_CLIENT_SECRET = 'super-secret-value-12345'
    const violations = findBaDraftEnvironmentViolations()
    const serialized = JSON.stringify(violations)
    expect(serialized).not.toContain('super-secret-value-12345')
  })
})

describe('assertSafeBaDraftEnvironment', () => {
  test('does not throw when clean', () => {
    process.env.BA_DRAFT_MODE = 'true'
    expect(() => assertSafeBaDraftEnvironment()).not.toThrow()
  })

  test('throws BaDraftConfigError, and the message never contains the secret value', () => {
    process.env.BA_DRAFT_MODE = 'true'
    process.env.KEYCLOAK_CLIENT_SECRET = 'super-secret-value-12345'
    try {
      assertSafeBaDraftEnvironment()
      expect.unreachable('expected assertSafeBaDraftEnvironment to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(BaDraftConfigError)
      const message = (err as Error).message
      expect(message).toContain('KEYCLOAK_CLIENT_SECRET')
      expect(message).not.toContain('super-secret-value-12345')
    }
  })
})
