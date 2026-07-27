import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('trusted BA Draft launcher', () => {
  const source = readFileSync(resolve(process.cwd(), 'scripts/run-ba-draft.mjs'), 'utf8')

  test.each([
    'NEXT_PUBLIC_AIRFLOW_URL', 'NEXT_PUBLIC_GRAFANA_URL',
    'NEXT_PUBLIC_OPENMETADATA_URL', 'NEXT_PUBLIC_JUPYTERHUB_URL',
    'NEXT_PUBLIC_MINIO_URL', 'PUBLIC_JUPYTERHUB_URL',
  ])('prevents Next dotenv from importing %s', (variable) => {
    expect(source).toContain(`'${variable}'`)
    expect(source).toContain("childEnvironment[key] = ''")
  })
})
