'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  DatabaseIcon,
  UserIcon,
  TagIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExternalLinkIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiCall } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { DataAsset, LineageData, GlossaryTermsResponse, Column } from '@/types/openmetadata'
import type { ApiResponse } from '@/types'

function SortableColumnTable({ columns }: { columns: Column[] }) {
  const [sortAsc, setSortAsc] = useState(true)

  const sorted = [...columns].sort((a, b) =>
    sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  )

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1 font-medium hover:text-slate-900"
            >
              Tên cột
              {sortAsc ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
            </button>
          </TableHead>
          <TableHead>Kiểu dữ liệu</TableHead>
          <TableHead>Nullable</TableHead>
          <TableHead>Mô tả</TableHead>
          <TableHead>Tags</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((col) => (
          <TableRow key={col.name}>
            <TableCell className="font-mono text-sm font-medium">{col.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="font-mono text-xs">
                {col.dataType}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-slate-500">
              {col.constraint === 'NOT_NULL' ? 'Không' : 'Có'}
            </TableCell>
            <TableCell className="text-sm text-slate-600 max-w-xs truncate">
              {col.description ?? <span className="text-slate-300">—</span>}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {col.tags?.map((t) => (
                  <Badge key={t.tagFQN} variant="secondary" className="text-xs px-1.5 py-0">
                    {t.tagFQN.split('.').pop()}
                  </Badge>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function LineageTab({ tableId, fqn }: { tableId: string; fqn: string }) {
  const omPublicUrl = process.env.NEXT_PUBLIC_OPENMETADATA_URL
  const [iframeError, setIframeError] = useState(false)

  const { data: lineageData, isLoading, error } = useQuery({
    queryKey: ['om-lineage', tableId],
    queryFn: async () => {
      const res = await apiCall<ApiResponse<LineageData>>(`/openmetadata/lineage/${tableId}`)
      return res.data
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 text-sm">
        Không thể tải thông tin lineage.
      </div>
    )
  }

  const upstreamNodes = lineageData?.upstreamEdges?.map((e) => e.fromEntity) ?? []
  const downstreamNodes = lineageData?.downstreamEdges?.map((e) => e.toEntity) ?? []

  const nodeMap = new Map(lineageData?.nodes?.map((n) => [n.id, n]) ?? [])

  const renderNodes = (ids: string[], direction: 'up' | 'down') => {
    if (ids.length === 0) return <span className="text-slate-400 text-sm">Không có</span>
    return (
      <ul className="space-y-1">
        {ids.map((id) => {
          const node = nodeMap.get(id)
          return (
            <li key={id} className="flex items-center gap-2 text-sm">
              {direction === 'up'
                ? <ArrowUpIcon className="size-3 text-blue-500" />
                : <ArrowDownIcon className="size-3 text-green-500" />}
              <span className="font-mono text-slate-700">{node?.fullyQualifiedName ?? id}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="space-y-6 p-1">
      {omPublicUrl && !iframeError ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500">Xem lineage đồ thị trong OpenMetadata</p>
            <a
              href={`${omPublicUrl}/explore/tables/${encodeURIComponent(fqn)}?activeTab=lineage`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Mở rộng <ExternalLinkIcon className="size-3" />
            </a>
          </div>
          <iframe
            src={`${omPublicUrl}/explore/tables/${encodeURIComponent(fqn)}?activeTab=lineage`}
            className="w-full h-96 rounded-lg border border-slate-200"
            onError={() => setIframeError(true)}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Dữ liệu từ (Upstream)
          </p>
          {renderNodes(upstreamNodes, 'up')}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Dữ liệu tới (Downstream)
          </p>
          {renderNodes(downstreamNodes, 'down')}
        </div>
      </div>
    </div>
  )
}

function GlossaryTab({ tags }: { tags: DataAsset['tags'] }) {
  const [search, setSearch] = useState('')

  const { data: glossaryData, isLoading } = useQuery({
    queryKey: ['om-glossary'],
    queryFn: async () => {
      const res = await apiCall<ApiResponse<GlossaryTermsResponse>>('/openmetadata/glossary')
      return res.data
    },
    staleTime: 60_000,
  })

  const tagLabels = new Set(tags?.map((t) => t.tagFQN) ?? [])
  const allTerms = glossaryData?.data ?? []

  const matchingTerms = allTerms.filter((term) =>
    tagLabels.size === 0 || tagLabels.has(term.fullyQualifiedName)
  )

  const filteredTerms = matchingTerms.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Lọc theo tên term..."
        className="w-full max-w-xs rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
      />
      {filteredTerms.length === 0 ? (
        <p className="text-sm text-slate-400 py-4">
          {matchingTerms.length === 0
            ? 'Table này không có glossary terms liên quan.'
            : 'Không tìm thấy term nào.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filteredTerms.map((term) => (
            <li key={term.id} className="py-3">
              <p className="text-sm font-medium text-slate-800">{term.name}</p>
              {term.glossary?.name && (
                <p className="text-xs text-slate-400">Glossary: {term.glossary.name}</p>
              )}
              {term.description && (
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{term.description}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TableDetailView({ id }: { id: string }) {
  const router = useRouter()

  const { data: tableData, isLoading, error } = useQuery({
    queryKey: ['om-table', id],
    queryFn: async () => {
      const res = await apiCall<ApiResponse<DataAsset>>(`/openmetadata/tables/${id}`)
      return res.data
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !tableData) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-red-600">Không thể tải thông tin table. Kiểm tra kết nối OpenMetadata.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.back()}>
          Quay lại
        </Button>
      </div>
    )
  }

  const table = tableData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="shrink-0 mt-0.5"
        >
          <ArrowLeftIcon className="size-4" />
          Quay lại
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">{table.name}</h1>
          <p className="text-sm font-mono text-slate-400 truncate">{table.fullyQualifiedName}</p>
        </div>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-4 text-sm">
        {(table.database || table.databaseSchema) && (
          <span className="flex items-center gap-1.5 text-slate-600">
            <DatabaseIcon className="size-4" />
            {[table.database?.name, table.databaseSchema?.name].filter(Boolean).join(' › ')}
          </span>
        )}
        {table.owner && (
          <span className="flex items-center gap-1.5 text-slate-600">
            <UserIcon className="size-4" />
            {table.owner.name}
          </span>
        )}
        {table.tableType && (
          <Badge variant="outline">{table.tableType}</Badge>
        )}
      </div>

      {table.tags && table.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {table.tags.map((tag) => (
            <Badge key={tag.tagFQN} variant="secondary" className="text-xs">
              <TagIcon className="size-3 mr-1" />
              {tag.tagFQN}
            </Badge>
          ))}
        </div>
      )}

      {table.description && (
        <p className="text-slate-600">{table.description}</p>
      )}

      {/* Tabs */}
      <Tabs defaultValue="schema">
        <TabsList>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="lineage">Lineage</TabsTrigger>
          <TabsTrigger value="glossary">Glossary</TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-4">
          {!table.columns || table.columns.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">Không có thông tin columns.</p>
          ) : (
            <div className="rounded-xl border bg-white shadow-sm overflow-x-auto">
              <SortableColumnTable columns={table.columns} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="lineage" className="mt-4">
          <div className="rounded-xl border bg-white shadow-sm p-4">
            <LineageTab tableId={table.id} fqn={table.fullyQualifiedName} />
          </div>
        </TabsContent>

        <TabsContent value="glossary" className="mt-4">
          <div className="rounded-xl border bg-white shadow-sm p-4">
            <GlossaryTab tags={table.tags} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
