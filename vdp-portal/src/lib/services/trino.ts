import type { TrinoStatementResponse, QueryResult } from '@/types/sql'

const TRINO_BASE_URL = process.env.INTERNAL_TRINO_URL ?? 'http://trino.trino.svc.cluster.local:8080'
const POLL_INTERVAL_MS = 100
const TIMEOUT_MS = 60_000

async function pollUntilDone(
  firstResponse: TrinoStatementResponse,
  username: string
): Promise<{ columns: string[]; rows: unknown[][] }> {
  const columns: string[] = []
  const rows: unknown[][] = []

  function extractBatch(res: TrinoStatementResponse) {
    if (res.columns && columns.length === 0) {
      columns.push(...res.columns.map((c) => c.name))
    }
    if (res.data) {
      rows.push(...res.data)
    }
  }

  extractBatch(firstResponse)

  let current = firstResponse
  const deadline = Date.now() + TIMEOUT_MS

  while (current.nextUri) {
    if (Date.now() > deadline) {
      await fetch(current.nextUri, { method: 'DELETE' }).catch(() => {})
      throw new Error('Query timeout: vượt quá 60 giây')
    }

    if (current.error) {
      throw new Error(current.error.message)
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))

    const res = await fetch(current.nextUri, {
      headers: { 'X-Trino-User': username },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Lỗi Trino: ${text}`)
    }

    current = (await res.json()) as TrinoStatementResponse
    extractBatch(current)
  }

  if (current.error) {
    throw new Error(current.error.message)
  }

  return { columns, rows }
}

export async function queryTrino(
  sql: string,
  options: { username: string; catalog?: string; schema?: string }
): Promise<QueryResult> {
  const start = Date.now()

  const res = await fetch(`${TRINO_BASE_URL}/v1/statement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'X-Trino-User': options.username,
      'X-Trino-Catalog': options.catalog ?? 'iceberg',
      'X-Trino-Schema': options.schema ?? 'default',
    },
    body: sql,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Lỗi Trino: ${text}`)
  }

  const first = (await res.json()) as TrinoStatementResponse

  if (first.error && !first.nextUri) {
    throw new Error(first.error.message)
  }

  const { columns, rows } = await pollUntilDone(first, options.username)

  return {
    columns,
    rows,
    stats: { elapsed: Date.now() - start, rowCount: rows.length },
  }
}

export async function trinoMetaQuery(
  sql: string,
  username: string
): Promise<string[]> {
  const result = await queryTrino(sql, { username, catalog: 'system', schema: 'information_schema' })
  return result.rows.map((row) => String(row[0]))
}

export async function listTrinoCatalogs(username: string): Promise<string[]> {
  return trinoMetaQuery('SHOW CATALOGS', username)
}

export async function listTrinoSchemas(catalog: string, username: string): Promise<string[]> {
  return trinoMetaQuery(`SHOW SCHEMAS FROM "${catalog}"`, username)
}

export async function listTrinoTables(catalog: string, schema: string, username: string): Promise<string[]> {
  return trinoMetaQuery(`SHOW TABLES FROM "${catalog}"."${schema}"`, username)
}
