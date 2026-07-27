'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { productApi, ProductApiError } from '@/lib/product-api'
import { Play, Save, Download, ShieldCheck } from 'lucide-react'
import { PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid, Tabs } from '@/components/product/enterprise-page'

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
    <div className="page-stack" data-testid="ba-query-editor">
      <PageHeader eyebrow="Query & consumption · mock execution" title="Authorized Query" description="Explore governed datasets and validate permission-aware SQL behavior. Execution remains deterministic and never reaches a real query engine." actions={<><Button variant="outline"><Save /> Save query</Button><Button variant="outline" disabled><Download /> Export constrained</Button></>} />
      <SummaryGrid><SummaryCard label="Workspace" value="Tenant Alpha" detail="Sales Analytics · UAT" tone="info"/><SummaryCard label="Engine" value="Mock SQL" detail="ProductApi /api/cp/v1/query" tone="success"/><SummaryCard label="Permission" value="Read only" detail="Masked PII · row limit 1,000" tone="warning" icon={<ShieldCheck/>}/><SummaryCard label="24h activity" value="148" detail="P95 1.8s · 0 writes" tone="info"/></SummaryGrid>
      <Tabs items={['Query editor','History','Saved queries','Audit references']} />
      <div className="query-layout">
        <SectionCard title="Catalog explorer" description="Authorized schemas and tables"><div className="p-3"><input className="mb-3 h-8 w-full rounded-md border bg-slate-50 px-2 text-xs" placeholder="Search catalog…"/><div className="space-y-2 text-xs"><div className="font-semibold text-slate-500">mock_catalog</div><div className="ml-2 rounded border border-cyan-200 bg-cyan-50 p-2"><strong>analytics</strong><div className="mt-2 rounded bg-white p-2 font-mono text-[10px] text-cyan-800">▦ fact_sales_daily</div></div><div className="ml-2 rounded border p-2"><strong>reference</strong><div className="mt-1 text-[10px] text-slate-500">region_dim · calendar_dim</div></div></div></div></SectionCard>
        <div className="space-y-3">
          <SectionCard title="SQL editor" description="Catalog mock_catalog · schema analytics · session read_only"><div className="border-b bg-amber-50 px-3 py-2 text-[10px] text-amber-800">Maximum 1,000 rows · estimated scan 1.8 MB · export disabled for masked fields</div><Textarea
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        rows={6}
        className="min-h-44 rounded-none border-0 bg-slate-950 p-4 font-mono text-sm text-slate-100 focus-visible:ring-0"
        data-testid="query-sql-input"
      /><div className="flex items-center justify-between border-t p-3"><div className="flex gap-2"><StatusChip tone="success">Policy check passed</StatusChip><StatusChip tone="info">LIMIT enforced</StatusChip></div><Button data-testid="run-query-button" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}><Play />{runMutation.isPending ? 'Đang chạy…' : 'Run query'}</Button></div></SectionCard>

      {result && (
        <SectionCard title="Result preview" description={`${result.rowCount} rows · mock execution 184 ms · correlation corr-ba-query-0001`} action={<StatusChip tone="success">Succeeded</StatusChip>}><div className="enterprise-table-wrap"><Table data-testid="query-results-table">
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
        </Table></div></SectionCard>
      )}
        </div>
      </div>
      <SectionCard title="Recent query history" description="Auditable local mock requests"><div className="grid grid-cols-[120px_1fr_110px_100px_180px] gap-3 border-b px-4 py-3 text-[10px]"><span className="font-mono">qr-0001</span><span className="font-mono">SELECT * FROM fact_sales_daily LIMIT 100</span><StatusChip tone="success">Succeeded</StatusChip><span>100 rows · 184 ms</span><span className="font-mono text-slate-500">corr-ba-query-0001</span></div></SectionCard>
    </div>
  )
}
