'use client'

import { useQuery } from '@tanstack/react-query'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { productApi } from '@/lib/product-api'
import type { CatalogEntry, Dataset } from '@/lib/ba-draft/fixtures/types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DataToolbar, PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid, Tabs } from '@/components/product/enterprise-page'
import { datasetExperience } from '@/lib/ba-draft/fixtures/experience'

type CatalogEntryWithDataset = CatalogEntry & { dataset?: Dataset }

export function BaCatalogClient({ catalogId }: { catalogId?: string }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-catalog'],
    queryFn: () => productApi.get<{ items: CatalogEntryWithDataset[] }>('/catalog'),
  })

  if (isLoading) return <LoadingState label="Đang tải catalog…" />
  if (error) return <ErrorState message="Không thể tải catalog." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có bảng nào được đăng ký vào catalog." />

  if (catalogId) {
    const entry = items.find((item) => item.id === catalogId) ?? items[0]
    const meta = datasetExperience[entry.datasetId]
    return <div className="page-stack" data-testid="ba-catalog-detail"><PageHeader eyebrow={`Trusted data product · ${entry.id}`} title={entry.name} description="Governed dataset detail with ownership, schema, sensitivity, quality, lineage, usage and authorized actions." actions={<><Button variant="outline">Request access</Button><Button>Open authorized query</Button></>} /><div className="flex gap-2"><StatusChip tone="success">Published</StatusChip><StatusChip tone="warning">Internal · PII masked</StatusChip><StatusChip tone="success">Quality 98.7%</StatusChip></div><SummaryGrid><SummaryCard label="Owner / steward" value="Data Eng. Alpha" detail="Steward Alpha" tone="info"/><SummaryCard label="Freshness" value="4h" detail="Daily · SLA 06:00" tone="success"/><SummaryCard label="Usage" value="148" detail="Queries in last 7 days" tone="info"/><SummaryCard label="Access" value="Workspace" detail="Masked columns enforced" tone="warning"/></SummaryGrid><Tabs items={['Metadata','Columns','Quality','Lineage','Usage','Related products','Access']} active={1}/><div className="split-grid"><SectionCard title="Column metadata" description="Types, business definitions, sensitivity and masking"><div className="enterprise-table-wrap"><Table><TableHeader><TableRow><TableHead>Column</TableHead><TableHead>Type</TableHead><TableHead>Classification</TableHead><TableHead>Masking</TableHead><TableHead>Description</TableHead><TableHead>Quality</TableHead></TableRow></TableHeader><TableBody>{[['transaction_date','date','Internal','None','Ngày ghi nhận giao dịch','100%'],['customer_id','varchar','Restricted · PII','Tokenized','Định danh khách hàng giả lập','99.9%'],['amount_vnd','decimal(18,2)','Internal','None','Giá trị giao dịch chuẩn hóa','98.7%'],['region_code','varchar','Internal','None','Mã vùng kinh doanh','100%']].map((row)=><TableRow key={row[0]}>{row.map((cell,index)=><TableCell key={cell} className={index<2?'font-mono text-[10px]':''}>{cell}</TableCell>)}</TableRow>)}</TableBody></Table></div></SectionCard><div className="space-y-3"><SectionCard title="Data product evidence"><div className="detail-grid !grid-cols-2"><div><span className="text-[9px] uppercase text-slate-500">Source</span><strong className="block text-xs">{meta.source}</strong></div><div><span className="text-[9px] uppercase text-slate-500">Schema</span><strong className="block font-mono text-[10px]">{meta.schema}</strong></div><div><span className="text-[9px] uppercase text-slate-500">Retention</span><strong className="block text-xs">{meta.retention}</strong></div><div><span className="text-[9px] uppercase text-slate-500">Policy</span><strong className="block text-xs">{meta.policy}</strong></div></div></SectionCard><SectionCard title="Lineage summary"><div className="p-4 text-xs"><span className="rounded border bg-sky-50 px-2 py-1">Sales JDBC</span><span className="mx-2">→</span><span className="rounded border bg-violet-50 px-2 py-1">Sales Daily Ingest</span><span className="mx-2">→</span><span className="rounded border bg-emerald-50 px-2 py-1">{entry.name}</span></div></SectionCard></div></div></div>
  }

  return (
    <div className="page-stack"><PageHeader eyebrow="Catalog & governance" title="Data Catalog" description="Khám phá data products đáng tin cậy theo domain, ownership, classification, quality, freshness và trạng thái quyền truy cập." actions={<Button variant="outline">Business glossary</Button>} /><SummaryGrid><SummaryCard label="Data products" value={items.length} detail="1 Gold · 0 deprecated" tone="info"/><SummaryCard label="Quality passed" value="100%" detail="Critical rules" tone="success"/><SummaryCard label="Restricted" value="1" detail="PII masked columns" tone="warning"/><SummaryCard label="Freshness" value="On time" detail="Observed 10:30 ICT" tone="success"/></SummaryGrid><DataToolbar placeholder="Search datasets, columns, tags or business terms" filters={<><button>All domains</button><button>Classification</button><button>Quality</button></>} /><SectionCard title="Trusted data products" description={`${items.length} results · workspace scope`}><div className="enterprise-table-wrap"><Table data-testid="catalog-table">
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Domain / owner</TableHead><TableHead>Tier / classification</TableHead><TableHead>Quality</TableHead><TableHead>Freshness</TableHead><TableHead>Scale</TableHead><TableHead>Access</TableHead><TableHead>Registered</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((entry) => (
          <TableRow key={entry.id} data-testid={`catalog-row-${entry.id}`}>
            <TableCell><Link href={`/catalog/${entry.id}`} className="font-medium text-cyan-700 hover:underline">{entry.name}</Link><div className="font-mono text-[9px] text-slate-400">analytics.{entry.name} · {entry.id}</div></TableCell>
            <TableCell>Sales Analytics<div className="text-[10px] text-slate-500">Data Engineering Alpha · Steward Alpha</div></TableCell><TableCell><StatusChip tone="warning">Gold · Internal · PII masked</StatusChip></TableCell><TableCell><StatusChip tone="success">98.7% · Passed</StatusChip></TableCell><TableCell>4h old<div className="text-[10px] text-slate-500">SLA 06:00 ICT</div></TableCell><TableCell>18 columns<div className="text-[10px] text-slate-500">2.4M rows · 1.8 GB</div></TableCell><TableCell><StatusChip tone="info">Workspace reader</StatusChip></TableCell>
            <TableCell>{new Date(entry.registeredAt).toLocaleString('vi-VN')}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table></div></SectionCard><div className="muted-note">No-match, restricted, stale and unavailable catalog states are represented without contacting OpenMetadata.</div></div>
  )
}
