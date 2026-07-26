'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { productApi, ProductApiError } from '@/lib/product-api'

interface QueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
}

export function BaQueryClient() {
  const [sql, setSql] = useState('SELECT * FROM fact_sales_daily LIMIT 100')
  const [result, setResult] = useState<QueryResult | null>(null)

  const runMutation = useMutation({
    mutationFn: () => productApi.post<QueryResult>('/query', { sql }),
    onSuccess: (data) => {
      setResult(data)
      toast.success(`Query thành công — ${data.rows.length} dòng.`)
    },
    onError: (err) => {
      setResult(null)
      toast.error(err instanceof ProductApiError ? err.message : 'Query thất bại.')
    },
  })

  const columns = result && result.rows.length > 0 ? Object.keys(result.rows[0]) : []

  return (
    <div className="space-y-4" data-testid="ba-query-editor">
      <Textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        rows={6}
        className="font-mono text-sm"
        data-testid="query-sql-input"
      />
      <Button data-testid="run-query-button" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
        {runMutation.isPending ? 'Đang chạy…' : 'Chạy query'}
      </Button>

      {result && (
        <Table data-testid="query-results-table">
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col}>{String(row[col])}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
