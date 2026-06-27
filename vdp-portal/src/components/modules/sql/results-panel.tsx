'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Loader2Icon, DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { QueryResult } from '@/types/sql'

interface ResultsPanelProps {
  isRunning: boolean
  elapsed: number
  result: QueryResult | null
  error: string | null
}

const PAGE_SIZE = 100

export function ResultsPanel({ isRunning, elapsed, result, error }: ResultsPanelProps) {
  const [page, setPage] = useState(0)

  if (isRunning) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-slate-500">
        <Loader2Icon className="size-4 animate-spin" />
        <span>Đang thực thi... ({elapsed}s)</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="m-3 rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-sm font-medium text-red-700">Lỗi thực thi</p>
        <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-red-600">{error}</pre>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Chạy query để xem kết quả
      </div>
    )
  }

  const totalPages = Math.ceil(result.rows.length / PAGE_SIZE)
  const pageRows = result.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function exportCsv() {
    if (!result) return
    const csv = Papa.unparse({
      fields: result.columns,
      data: result.rows.map((row) => row.map((cell) => cell ?? '')),
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-result-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-slate-50 px-3 py-2">
        <span className="text-xs text-slate-500">
          Trả về <strong>{result.stats.rowCount}</strong> hàng trong{' '}
          <strong>{(result.stats.elapsed / 1000).toFixed(2)}s</strong>
        </span>
        <Button variant="outline" size="sm" onClick={exportCsv} className="h-7 gap-1.5 text-xs">
          <DownloadIcon className="size-3" />
          Export CSV
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {result.columns.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            Query thực thi thành công (không có kết quả trả về)
          </div>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100">
              <tr>
                {result.columns.map((col) => (
                  <th
                    key={col}
                    className="border-b border-r border-slate-200 px-3 py-2 text-left font-semibold text-slate-600 last:border-r-0"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-slate-50 even:bg-slate-50/40">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border-b border-r border-slate-100 px-3 py-1.5 font-mono text-slate-700 last:border-r-0"
                    >
                      {cell === null || cell === undefined ? (
                        <span className="text-slate-300">NULL</span>
                      ) : (
                        String(cell)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-between border-t bg-slate-50 px-3 py-2">
          <span className="text-xs text-slate-400">
            Trang {page + 1} / {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
              className="h-7 text-xs"
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
              className="h-7 text-xs"
            >
              Tiếp
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
