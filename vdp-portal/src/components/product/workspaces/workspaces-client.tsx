'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { Workspace } from '@/lib/ba-draft/fixtures/types'

type WorkspaceWithCount = Workspace & { memberCount: number }

export function WorkspacesClient() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-workspaces'],
    queryFn: () => productApi.get<{ items: WorkspaceWithCount[] }>('/workspaces'),
  })

  if (isLoading) return <LoadingState label="Đang tải workspaces…" />
  if (error) return <ErrorState message="Không thể tải danh sách workspaces." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có workspace nào." />

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="workspaces-grid">
      {items.map((ws) => {
        const pct = Math.round((ws.quota.storageGbUsed / ws.quota.storageGbLimit) * 100)
        return (
          <Link key={ws.id} href={`/workspaces/${ws.id}`} data-testid={`workspace-card-${ws.id}`}>
            <Card className="hover:border-slate-400 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">{ws.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-500">
                <div>Tenant: {ws.tenant}</div>
                <div>{ws.memberCount} thành viên</div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Storage</span>
                    <span>
                      {ws.quota.storageGbUsed}/{ws.quota.storageGbLimit} GB
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
