export type SqlEngine = 'trino' | 'starrocks'

export interface QueryResult {
  columns: string[]
  rows: unknown[][]
  stats: {
    elapsed: number
    rowCount: number
  }
}

export interface TrinoStatementResponse {
  id: string
  nextUri?: string
  columns?: Array<{ name: string; type: string }>
  data?: unknown[][]
  stats: {
    state: string
    elapsedTimeMillis: number
    processedRows: number
  }
  error?: {
    message: string
    errorCode: number
    errorName?: string
    errorType?: string
  }
}

export interface QueryHistoryItem {
  id: string
  sql: string
  engine: SqlEngine
  timestamp: number
}
