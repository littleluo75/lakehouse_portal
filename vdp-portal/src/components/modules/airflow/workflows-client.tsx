'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { useCurrentUser } from '@/hooks/use-current-user'
import { RoleGuard } from '@/components/role-guard'
import { DagStatsCards } from './dag-stats-cards'
import { DagDetailDrawer } from './dag-detail-drawer'
import { TriggerDialog } from './trigger-dialog'
import { RunStateBadge, DagStatusBadge } from './status-badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SearchIcon, RefreshCwIcon } from 'lucide-react'
import type { DAG, DAGRun, AirflowDagsResponse, AirflowDagRunsResponse } from '@/types/airflow'

export function WorkflowsClient() {
  const queryClient = useQueryClient()
  const { hasRole } = useCurrentUser()

  const [selectedDag, setSelectedDag] = useState<DAG | null>(null)
  const [triggerDag, setTriggerDag] = useState<DAG | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  const [filterState, setFilterState] = useState('all')

  const canManage = hasRole(['Op', 'Admin', 'SuperAdmin'])


  const {
    data: dagsData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['airflow-dags'],
    queryFn: async () => {
      const res = await fetch('/api/airflow/dags')
      if (!res.ok) throw new Error('Không thể tải danh sách DAGs')
      const json = await res.json() as { success: boolean; data: AirflowDagsResponse }
      return json.data
    },
    refetchInterval: 30_000,
  })

  const { data: runsData, isLoading: isLoadingRuns } = useQuery({
    queryKey: ['airflow-dag-runs', selectedDag?.dag_id],
    queryFn: async () => {
      const res = await fetch(`/api/airflow/dags/${selectedDag!.dag_id}/runs`)
      if (!res.ok) throw new Error('Không thể tải lịch sử runs')
      const json = await res.json() as { success: boolean; data: AirflowDagRunsResponse }
      return json.data
    },
    enabled: !!selectedDag,
  })

  const pauseMutation = useMutation({
    mutationFn: async ({ dagId, isPaused }: { dagId: string; isPaused: boolean }) => {
      const res = await fetch(`/api/airflow/dags/${dagId}/pause`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paused: isPaused }),
      })
      if (!res.ok) throw new Error('Không thể cập nhật trạng thái')
    },
    onSuccess: (_, { dagId, isPaused }) => {
      toast.success(`DAG ${dagId} đã được ${isPaused ? 'tạm dừng' : 'bật lại'}`)
      queryClient.invalidateQueries({ queryKey: ['airflow-dags'] })
    },
    onError: () => toast.error('Không thể cập nhật trạng thái DAG'),
  })

  const triggerMutation = useMutation({
    mutationFn: async ({ dagId, conf }: { dagId: string; conf: Record<string, unknown> }) => {
      const res = await fetch(`/api/airflow/dags/${dagId}/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conf }),
      })
      if (!res.ok) throw new Error('Không thể kích hoạt DAG')
    },
    onSuccess: (_, { dagId }) => {
      toast.success(`DAG ${dagId} đã được kích hoạt`)
      setTriggerDag(null)
      queryClient.invalidateQueries({ queryKey: ['airflow-dags'] })
      queryClient.invalidateQueries({ queryKey: ['airflow-dag-runs', dagId] })
    },
    onError: () => toast.error('Không thể kích hoạt DAG'),
  })

  const dags = dagsData?.dags ?? []

  const allTags = useMemo(
    () => [...new Set(dags.flatMap((d) => d.tags.map((t) => t.name)))].sort(),
    [dags]
  )

  const filteredDags = useMemo(() => {
    return dags.filter((dag) => {
      const matchesSearch =
        !searchQuery || dag.dag_id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTag =
        filterTag === 'all' || dag.tags.some((t) => t.name === filterTag)
      const matchesState =
        filterState === 'all' ||
        (filterState === 'active' && dag.is_active && !dag.is_paused) ||
        (filterState === 'paused' && dag.is_paused) ||
        (filterState === 'inactive' && !dag.is_active)
      return matchesSearch && matchesTag && matchesState
    })
  }, [dags, searchQuery, filterTag, filterState])

  const stats = useMemo(
    () => ({
      total: dags.length,
      active: dags.filter((d) => d.is_active && !d.is_paused).length,
      paused: dags.filter((d) => d.is_paused).length,
      failedLastRun: dags.filter((d) => d.last_dagrun_data?.state === 'failed').length,
    }),
    [dags]
  )

  const columns: ColumnDef<DAG>[] = useMemo(
    () => [
      {
        accessorKey: 'dag_id',
        header: 'DAG',
        cell: ({ row }) => (
          <button
            onClick={() => setSelectedDag(row.original)}
            className="font-mono text-sm font-medium text-blue-600 hover:underline text-left"
          >
            {row.original.dag_id}
          </button>
        ),
      },
      {
        id: 'tags',
        header: 'Tags',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.map((t) => (
              <span
                key={t.name}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
              >
                {t.name}
              </span>
            ))}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <DagStatusBadge
            isPaused={row.original.is_paused}
            isActive={row.original.is_active}
          />
        ),
      },
      {
        id: 'lastRun',
        header: 'Lần chạy cuối',
        cell: ({ row }) => {
          const state = row.original.last_dagrun_data?.state
          return state ? <RunStateBadge state={state} /> : <span className="text-slate-400 text-sm">—</span>
        },
      },
      {
        accessorKey: 'schedule_interval',
        header: 'Lịch chạy',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-500">
            {row.original.schedule_interval ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const dag = row.original
          return (
            <div className="flex items-center gap-2">
              <RoleGuard roles={['Op', 'Admin', 'SuperAdmin']}>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() =>
                    pauseMutation.mutate({ dagId: dag.dag_id, isPaused: !dag.is_paused })
                  }
                  disabled={pauseMutation.isPending}
                >
                  {dag.is_paused ? 'Bật' : 'Tạm dừng'}
                </Button>
                <Button
                  size="xs"
                  onClick={() => setTriggerDag(dag)}
                >
                  Trigger
                </Button>
              </RoleGuard>
            </div>
          )
        },
      },
    ],
    [canManage, pauseMutation]
  )

  const table = useReactTable({
    data: filteredDags,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const runs: DAGRun[] = runsData?.dag_runs ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflows</h1>
          <p className="text-sm text-slate-500">Quản lý và monitor DAGs của Apache Airflow</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCwIcon className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      <DagStatsCards stats={stats} isLoading={isLoading} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm DAG..."
            className="pl-8"
          />
        </div>

        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">Tất cả tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Active</option>
          <option value="paused">Tạm dừng</option>
          <option value="inactive">Không active</option>
        </select>
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
            <p className="text-red-600">Không thể tải danh sách DAGs. Kiểm tra kết nối Airflow.</p>
          </div>
        ) : filteredDags.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">Không tìm thấy DAG nào.</p>
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
                <TableRow key={row.id}>
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

      <DagDetailDrawer
        dag={selectedDag}
        runs={runs}
        isLoadingRuns={isLoadingRuns}
        open={!!selectedDag}
        canManage={canManage}
        onClose={() => setSelectedDag(null)}
        onTrigger={(dag) => setTriggerDag(dag)}
      />

      <TriggerDialog
        dag={triggerDag}
        onClose={() => setTriggerDag(null)}
        onConfirm={(dagId, conf) => triggerMutation.mutate({ dagId, conf })}
        isPending={triggerMutation.isPending}
      />
    </div>
  )
}
