'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/api-client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCwIcon, ExternalLinkIcon } from 'lucide-react'
import { SparkStatsCards } from './spark-stats-cards'
import { SparkStateBadge } from './spark-status-badge'
import { SparkJobDrawer } from './spark-job-drawer'
import type { SparkApplication, SparkAppState, SparkApplicationsResponse } from '@/types/spark'

function formatDuration(startIso?: string, endIso?: string): string {
  if (!startIso) return '—'
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const seconds = Math.floor((end - start) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

function getSparkUiUrl(app: SparkApplication): string {
  const ingressUrl = app.status?.sparkWebUI?.ingressURL
  if (ingressUrl) return ingressUrl
  return `https://${app.metadata.name}-spark-operator.spark-ui.lakehouse.local`
}

const STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'RUNNING', label: 'Đang chạy' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'FAILED', label: 'Thất bại' },
  { value: 'SUBMITTED', label: 'Đã gửi' },
  { value: 'PENDING', label: 'Chờ' },
]

export function SparkJobsClient() {
  const [selectedApp, setSelectedApp] = useState<SparkApplication | null>(null)
  const [stateFilter, setStateFilter] = useState('all')

  const {
    data,
    isLoading,
    error,
    refetch: reload,
    isFetching,
  } = useQuery({
    queryKey: ['spark-applications'],
    queryFn: async () => {
      const json = await apiCall<{ success: boolean; data: SparkApplicationsResponse }>('/spark/applications?namespace=spark-operator')
      return json.data
    },
    refetchInterval: 30_000,
  })

  const allItems: SparkApplication[] = useMemo(() => data?.items ?? [], [data?.items])

  const filteredItems = useMemo(() => {
    if (stateFilter === 'all') return allItems
    return allItems.filter(
      (app) => (app.status?.applicationState?.state ?? 'UNKNOWN') === stateFilter
    )
  }, [allItems, stateFilter])

  const stats = useMemo(
    () => ({
      running: allItems.filter((a) => a.status?.applicationState?.state === 'RUNNING').length,
      completed: allItems.filter((a) => a.status?.applicationState?.state === 'COMPLETED').length,
      failed: allItems.filter((a) => a.status?.applicationState?.state === 'FAILED').length,
      pending: allItems.filter((a) => {
        const s = a.status?.applicationState?.state
        return s === 'SUBMITTED' || s === 'PENDING'
      }).length,
    }),
    [allItems]
  )

  const columns: ColumnDef<SparkApplication>[] = useMemo(
    () => [
      {
        accessorKey: 'metadata.name',
        header: 'Tên job',
        cell: ({ row }) => (
          <button
            onClick={() => setSelectedApp(row.original)}
            className="font-mono text-sm font-medium text-blue-600 hover:underline text-left"
          >
            {row.original.metadata.name}
          </button>
        ),
      },
      {
        accessorKey: 'spec.type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-mono">
            {row.original.spec.type}
          </span>
        ),
      },
      {
        id: 'state',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const state: SparkAppState = row.original.status?.applicationState?.state ?? 'UNKNOWN'
          return <SparkStateBadge state={state} />
        },
      },
      {
        id: 'startTime',
        header: 'Bắt đầu',
        cell: ({ row }) => {
          const t = row.original.status?.lastSubmissionAttemptTime
          return (
            <span className="text-sm text-slate-600">
              {t ? new Date(t).toLocaleString('vi-VN') : '—'}
            </span>
          )
        },
      },
      {
        id: 'duration',
        header: 'Duration',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-slate-600">
            {formatDuration(
              row.original.status?.lastSubmissionAttemptTime,
              row.original.status?.terminationTime
            )}
          </span>
        ),
      },
      {
        id: 'sparkUi',
        header: 'Spark UI',
        cell: ({ row }) => (
          <a
            href={getSparkUiUrl(row.original)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
          >
            <ExternalLinkIcon className="size-3" />
            UI
          </a>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Spark Jobs</h1>
          <p className="text-sm text-slate-500">Danh sách SparkApplication từ Kubernetes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => reload()}
          disabled={isFetching}
        >
          <RefreshCwIcon className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <SparkStatsCards stats={stats} isLoading={isLoading} />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {STATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-400">
          {filteredItems.length} jobs
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">
              Không thể tải danh sách Spark jobs. Kiểm tra kết nối K8s.
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">Không tìm thấy Spark job nào.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <SparkJobDrawer
        app={selectedApp}
        open={!!selectedApp}
        onClose={() => setSelectedApp(null)}
      />
    </div>
  )
}
