import mysql from 'mysql2/promise'
import type { QueryResult } from '@/types/sql'

export async function queryStarRocks(sql: string): Promise<QueryResult> {
  const host = process.env.STARROCKS_HOST
  const port = process.env.STARROCKS_PORT
  const user = process.env.STARROCKS_USER
  if (!host || !port || !user) {
    throw new Error(
      'StarRocks chưa được cấu hình. Kiểm tra biến môi trường STARROCKS_HOST/STARROCKS_PORT/STARROCKS_USER.'
    )
  }

  const connection = await mysql.createConnection({
    host,
    port: Number(port),
    user,
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
