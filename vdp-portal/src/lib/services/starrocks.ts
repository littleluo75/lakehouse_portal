import mysql from 'mysql2/promise'
import type { QueryResult } from '@/types/sql'

export async function queryStarRocks(sql: string): Promise<QueryResult> {
  const connection = await mysql.createConnection({
    host: process.env.STARROCKS_HOST ?? '10.167.70.13',
    port: Number(process.env.STARROCKS_PORT ?? 30030),
    user: process.env.STARROCKS_USER ?? 'root',
    password: process.env.STARROCKS_PASSWORD ?? '',
    database: 'information_schema',
    connectTimeout: 10_000,
  })

  const start = Date.now()

  try {
    const [rowsRaw, fields] = await connection.execute(sql)
    const columns = (fields ?? []).map((f) => f.name)
    const rows = (rowsRaw as Record<string, unknown>[]).map((row) =>
      columns.map((col) => row[col])
    )
    return {
      columns,
      rows,
      stats: { elapsed: Date.now() - start, rowCount: rows.length },
    }
  } finally {
    await connection.end()
  }
}
