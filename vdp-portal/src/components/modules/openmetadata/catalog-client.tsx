'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { SearchIcon, DatabaseIcon, UserIcon, TagIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DataAsset, OmSearchResponse } from '@/types/openmetadata'
import type { ApiResponse } from '@/types'
import { useDebounce } from './use-debounce'
import { apiCall } from '@/lib/api-client'

function AssetCard({ asset, onClick }: { asset: DataAsset; onClick: () => void }) {
  const visibleTags = asset.tags?.slice(0, 3) ?? []
  const extraTags = (asset.tags?.length ?? 0) - 3

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md border border-slate-200"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div>
          <p className="font-semibold text-slate-900 truncate">{asset.name}</p>
          <p className="text-xs text-slate-400 truncate font-mono">{asset.fullyQualifiedName}</p>
        </div>

        {(asset.database || asset.databaseSchema) && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <DatabaseIcon className="size-3 shrink-0" />
            <span>
              {[asset.database?.name, asset.databaseSchema?.name].filter(Boolean).join(' › ')}
            </span>
          </div>
        )}

        {asset.description && (
          <p className="text-sm text-slate-600 line-clamp-2">{asset.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {visibleTags.map((tag) => (
            <Badge key={tag.tagFQN} variant="secondary" className="text-xs px-1.5 py-0">
              <TagIcon className="size-3 mr-0.5" />
              {tag.tagFQN.split('.').pop()}
            </Badge>
          ))}
          {extraTags > 0 && (
            <span className="text-xs text-slate-400">+{extraTags} more</span>
          )}
        </div>

        {asset.owner && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <UserIcon className="size-3 shrink-0" />
            <span>{asset.owner.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function FilterSection({
  title,
  options,
  selected,
  onChange,
}: {
  title: string
  options: string[]
  selected: Set<string>
  onChange: (val: string) => void
}) {
  if (options.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={selected.has(opt)}
              onChange={() => onChange(opt)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 group-hover:text-slate-900 truncate">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}

export function CatalogClient() {
  const router = useRouter()
  const [searchInput, setSearchInput] = useState('')
  const [selectedDbs, setSelectedDbs] = useState<Set<string>>(new Set())
  const [selectedSchemas, setSelectedSchemas] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  const debouncedQuery = useDebounce(searchInput, 300)

  const { data: searchData, isLoading, error } = useQuery({
    queryKey: ['om-search', debouncedQuery],
    queryFn: async () => {
      const params = new URLSearchParams({ q: debouncedQuery, limit: '100', page: '0' })
      const res = await apiCall<ApiResponse<OmSearchResponse>>(`/openmetadata/search?${params}`)
      return res.data
    },
    staleTime: 30_000,
  })

  const assets: DataAsset[] = useMemo(
    () => searchData?.hits?.hits?.map((h) => h._source) ?? [],
    [searchData]
  )
  const totalCount = searchData?.hits?.total?.value ?? 0

  const allDbs = useMemo(
    () => [...new Set(assets.map((a) => a.database?.name).filter(Boolean) as string[])].sort(),
    [assets]
  )
  const allSchemas = useMemo(() => {
    const source = selectedDbs.size > 0
      ? assets.filter((a) => a.database?.name && selectedDbs.has(a.database.name))
      : assets
    return [...new Set(source.map((a) => a.databaseSchema?.name).filter(Boolean) as string[])].sort()
  }, [assets, selectedDbs])
  const allTags = useMemo(
    () => [...new Set(assets.flatMap((a) => a.tags?.map((t) => t.tagFQN.split('.').pop() ?? t.tagFQN) ?? []))].sort(),
    [assets]
  )

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (selectedDbs.size > 0 && (!a.database?.name || !selectedDbs.has(a.database.name))) return false
      if (selectedSchemas.size > 0 && (!a.databaseSchema?.name || !selectedSchemas.has(a.databaseSchema.name))) return false
      if (selectedTags.size > 0) {
        const assetTagLabels = new Set(a.tags?.map((t) => t.tagFQN.split('.').pop() ?? t.tagFQN))
        if (![...selectedTags].some((t) => assetTagLabels.has(t))) return false
      }
      return true
    })
  }, [assets, selectedDbs, selectedSchemas, selectedTags])

  const toggleFilter = useCallback((set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const next = new Set(set)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    setFn(next)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Catalog</h1>
        <p className="text-sm text-slate-500">Khám phá và tìm kiếm data assets trong hệ thống</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm kiếm tables, schemas, datasets..."
          className="pl-10 h-12 text-base rounded-xl border-slate-300 focus-visible:ring-blue-500"
        />
      </div>

      {debouncedQuery && !isLoading && (
        <p className="text-sm text-slate-500">
          Tìm thấy <span className="font-semibold text-slate-800">{filteredAssets.length}</span> kết quả
          {filteredAssets.length !== totalCount && ` (đã lọc từ ${totalCount})`}
          {debouncedQuery ? ` cho "${debouncedQuery}"` : ''}
        </p>
      )}

      <div className="flex gap-6">
        {/* Filter sidebar */}
        <aside className="w-52 shrink-0 space-y-5">
          <FilterSection
            title="Database"
            options={allDbs}
            selected={selectedDbs}
            onChange={(v) => toggleFilter(selectedDbs, setSelectedDbs, v)}
          />
          <FilterSection
            title="Schema"
            options={allSchemas}
            selected={selectedSchemas}
            onChange={(v) => toggleFilter(selectedSchemas, setSelectedSchemas, v)}
          />
          <FilterSection
            title="Tags"
            options={allTags}
            selected={selectedTags}
            onChange={(v) => toggleFilter(selectedTags, setSelectedTags, v)}
          />
          {(selectedDbs.size > 0 || selectedSchemas.size > 0 || selectedTags.size > 0) && (
            <button
              onClick={() => {
                setSelectedDbs(new Set())
                setSelectedSchemas(new Set())
                setSelectedTags(new Set())
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
              <p className="text-red-600">Không thể kết nối OpenMetadata. Kiểm tra cấu hình dịch vụ.</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
              <DatabaseIcon className="mx-auto size-10 text-slate-300 mb-3" />
              <p className="text-slate-500">
                {debouncedQuery ? `Không tìm thấy kết quả cho "${debouncedQuery}"` : 'Chưa có data asset nào.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onClick={() => router.push(`/catalog/${asset.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
