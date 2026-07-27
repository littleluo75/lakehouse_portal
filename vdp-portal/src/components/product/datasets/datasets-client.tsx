'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { Dataset } from '@/lib/ba-draft/fixtures/types'
import { datasetExperience } from '@/lib/ba-draft/fixtures/experience'
import { DataToolbar, PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid, Tabs } from '@/components/product/enterprise-page'

const STATUS_VARIANT: Record<Dataset['publicationStatus'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  publishing: 'outline',
  published: 'default',
  failed: 'destructive',
}

export function DatasetsClient() {
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-datasets'],
    queryFn: () => productApi.get<{ items: Dataset[] }>('/datasets'),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => productApi.post(`/datasets/${id}/publish`, { scenario: 'success' }),
    onSuccess: () => {
      toast.success('Đã publish dataset và đăng ký vào catalog.')
      queryClient.invalidateQueries({ queryKey: ['ba-datasets'] })
      queryClient.invalidateQueries({ queryKey: ['ba-catalog'] })
    },
    onError: (err) => toast.error(err instanceof ProductApiError ? err.message : 'Publish thất bại.'),
  })

  if (isLoading) return <LoadingState label="Đang tải datasets…" />
  if (error) return <ErrorState message="Không thể tải danh sách datasets." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có dataset nào." />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Data products · publication" title="Dataset publication" description="Chuẩn hóa metadata, ownership, classification, quality, lineage, freshness, retention và access policy trước khi đăng ký catalog." actions={<Button>Create publication draft</Button>} />
      <SummaryGrid><SummaryCard label="Drafts" value={items.filter((item) => item.publicationStatus === 'draft').length} detail="1 validation issue" tone="warning"/><SummaryCard label="Published" value={items.filter((item) => item.publicationStatus === 'published').length} detail="Registered in catalog" tone="success"/><SummaryCard label="Quality passed" value="1/2" detail="Critical rules only" tone="warning"/><SummaryCard label="Freshness on time" value="2/2" detail="Current workspace outputs" tone="success"/></SummaryGrid>
      <Tabs items={['Publication queue','Published products','Validation issues']} />
      <DataToolbar placeholder="Tìm dataset, schema, owner hoặc tag" />
      <SectionCard title="Publication registry" description="Drafts remain editable; published products link to governed catalog metadata"><div className="enterprise-table-wrap">
      <Table data-testid="datasets-table">
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Source / schema</TableHead><TableHead>Ownership</TableHead><TableHead>Classification</TableHead><TableHead>Quality / freshness</TableHead><TableHead>Lineage / retention</TableHead><TableHead>Access policy</TableHead><TableHead>Publication</TableHead>
          <TableHead className="text-right">Hành động</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((ds) => { const meta = datasetExperience[ds.id]; return (
          <TableRow key={ds.id} data-testid={`dataset-row-${ds.id}`}>
            <TableCell><strong>{ds.name}</strong><div className="font-mono text-[9px] text-slate-400">{ds.id} · {meta.schema}</div></TableCell>
            <TableCell>{meta.source}<div className="text-[10px] text-slate-500">{meta.schema}</div></TableCell><TableCell>{meta.owner}<div className="text-[10px] text-slate-500">Steward: {meta.steward}</div></TableCell><TableCell><StatusChip tone="warning">{meta.classification}</StatusChip></TableCell><TableCell><StatusChip tone={meta.quality.includes('Passed') ? 'success' : 'warning'}>{meta.quality}</StatusChip><div className="mt-1 text-[10px] text-slate-500">{meta.freshness}</div></TableCell><TableCell>{meta.lineage}<div className="text-[10px] text-slate-500">Retention {meta.retention}</div></TableCell><TableCell>{meta.policy}<div className="text-[10px] text-slate-500">{meta.issues}</div></TableCell><TableCell>
              <Badge variant={STATUS_VARIANT[ds.publicationStatus]}>{ds.publicationStatus}</Badge>
              <div className="mt-1 text-[10px] text-slate-500">Catalog: {ds.catalogRegistered ? 'Có · Registered' : 'Không · Not registered'}</div></TableCell>
            <TableCell className="text-right">
              {ds.publicationStatus !== 'published' && (
                <Button
                  size="sm"
                  data-testid={`publish-dataset-${ds.id}`}
                  onClick={() => publishMutation.mutate(ds.id)}
                  disabled={publishMutation.isPending}
                >
                  Publish
                </Button>
              )}
            </TableCell>
          </TableRow>
        )})}
      </TableBody>
    </Table></div></SectionCard><div className="muted-note">Publication is blocked when required metadata, quality thresholds or access policy are incomplete. No real catalog tool is contacted.</div></div>
  )
}
