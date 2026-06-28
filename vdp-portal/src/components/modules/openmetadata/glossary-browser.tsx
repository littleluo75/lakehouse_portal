'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, BookOpenIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { GlossaryTermsResponse } from '@/types/openmetadata'
import type { ApiResponse } from '@/types'
import { apiCall } from '@/lib/api-client'

export function GlossaryBrowser() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['om-glossary'],
    queryFn: async () => {
      const res = await apiCall<ApiResponse<GlossaryTermsResponse>>('/openmetadata/glossary')
      return res.data
    },
    staleTime: 60_000,
  })

  const terms = data?.data ?? []
  const filtered = terms.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/catalog')}>
          <ArrowLeftIcon className="size-4" />
          Data Catalog
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Glossary</h1>
          <p className="text-sm text-slate-500">Từ điển thuật ngữ dữ liệu</p>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm kiếm term..."
        className="w-full max-w-sm rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-600 text-sm">Không thể tải glossary. Kiểm tra kết nối OpenMetadata.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
          <BookOpenIcon className="mx-auto size-10 text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">
            {search ? `Không tìm thấy term nào cho "${search}"` : 'Chưa có glossary terms.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm divide-y divide-slate-100">
          {filtered.map((term) => (
            <div key={term.id} className="px-4 py-3">
              <div className="flex items-baseline gap-2">
                <p className="font-medium text-slate-900">{term.name}</p>
                {term.glossary?.name && (
                  <span className="text-xs text-slate-400">{term.glossary.name}</span>
                )}
              </div>
              {term.description && (
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{term.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
