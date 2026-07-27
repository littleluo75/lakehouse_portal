'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState, ErrorState, EmptyState } from '@/components/ba-draft/status-states'
import { DeleteConnectionButton } from './delete-connection-button'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { Connection, PersonaRole } from '@/lib/ba-draft/fixtures/types'
import { Plus } from 'lucide-react'
import { connectionExperience } from '@/lib/ba-draft/fixtures/experience'
import { DataToolbar, PageHeader, SectionCard, StatusChip, SummaryCard, SummaryGrid } from '@/components/product/enterprise-page'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const STATUS_VARIANT: Record<Connection['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  paused: 'secondary',
  validating: 'outline',
  invalid: 'destructive',
  deleting: 'destructive',
}

export function ConnectionsClient({ personaRole }: { personaRole: PersonaRole }) {
  const queryClient = useQueryClient()
  const [pendingValidateId, setPendingValidateId] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ba-connections'],
    queryFn: () => productApi.get<{ items: Connection[] }>('/connections'),
  })

  const validateMutation = useMutation({
    mutationFn: (id: string) => {
      setPendingValidateId(id)
      return productApi.post(`/connections/${id}/validate`)
    },
    onSuccess: () => {
      toast.success('Validate connection thành công.')
      queryClient.invalidateQueries({ queryKey: ['ba-connections'] })
    },
    onError: (err) => {
      toast.error(err instanceof ProductApiError ? err.message : 'Validate thất bại.')
    },
    onSettled: () => setPendingValidateId(null),
  })

  if (isLoading) return <LoadingState label="Đang tải connections…" />
  if (error) return <ErrorState message="Không thể tải danh sách connections." onRetry={() => refetch()} />
  const items = data?.items ?? []
  if (items.length === 0) return <EmptyState label="Chưa có connection nào trong workspace này." />

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Data sources · credential-reference only" title="Connections" description="Quản lý nguồn dữ liệu, trạng thái xác thực, sức khỏe, phụ thuộc và vòng đời mà không hiển thị hoặc lưu credential thật." actions={<Button onClick={() => { setWizardStep(0); setWizardOpen(true) }}><Plus /> Create connection</Button>} />
      <SummaryGrid><SummaryCard label="Total connections" value={items.length} detail="3 source technologies" tone="info"/><SummaryCard label="Healthy" value={items.filter((item) => item.status === 'active').length} detail="Validated in last 24h" tone="success"/><SummaryCard label="Needs attention" value={items.filter((item) => item.status !== 'active').length} detail="Stale or paused" tone="warning"/><SummaryCard label="In use" value={items.filter((item) => item.inUse).length} detail="Deletion protected" tone="info"/></SummaryGrid>
      <DataToolbar placeholder="Tìm connection, owner hoặc dependency" filters={<><button>All types</button><button>Health</button><button>Lifecycle</button></>} />
      <SectionCard title="Connection inventory" description={`${items.length} resources · workspace scope · last observed 10:30 ICT`}>
      <div className="enterprise-table-wrap"><Table data-testid="connections-table">
      <TableHeader>
        <TableRow>
          <TableHead>Tên</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Credential ref</TableHead>
          <TableHead>Validation / health</TableHead>
          <TableHead>Dependencies</TableHead>
          <TableHead>Lifecycle / operation</TableHead>
          <TableHead>Last successful check</TableHead>
          <TableHead className="text-right">Hành động</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((conn) => {
          const meta = connectionExperience[conn.id]
          return <TableRow key={conn.id} data-testid={`connection-row-${conn.id}`}>
            <TableCell><div className="font-medium">{conn.name}</div><div className="font-mono text-[9px] text-slate-400">{conn.id} · workspace/{conn.workspaceId}</div></TableCell>
            <TableCell>{conn.type}</TableCell>
            <TableCell>{meta.owner}</TableCell>
            <TableCell><StatusChip tone={meta.credential.includes('valid') ? 'success' : 'warning'}>{meta.credential}</StatusChip></TableCell>
            <TableCell><StatusChip tone={conn.status === 'active' ? 'success' : conn.status === 'invalid' ? 'danger' : 'warning'}>{meta.health}</StatusChip><div className="mt-1 text-[10px] text-slate-500">{meta.validation}</div></TableCell>
            <TableCell>{meta.dependencies}</TableCell>
            <TableCell><Badge variant={STATUS_VARIANT[conn.status]}>{conn.status}</Badge><div className="mt-1 text-[10px] text-slate-500">{meta.operation}</div></TableCell>
            <TableCell>{conn.lastValidatedAt ? new Date(conn.lastValidatedAt).toLocaleString('vi-VN') : '—'}</TableCell>
            <TableCell className="text-right space-x-1">
              <Button
                variant="outline"
                size="sm"
                data-testid={`validate-connection-${conn.id}`}
                onClick={() => validateMutation.mutate(conn.id)}
                disabled={pendingValidateId === conn.id}
              >
                {pendingValidateId === conn.id ? 'Đang validate…' : 'Validate'}
              </Button>
              <DeleteConnectionButton connection={conn} personaRole={personaRole} />
            </TableCell>
          </TableRow>
        })}
      </TableBody>
    </Table></div></SectionCard>
      <div className="muted-note">Create connection follows a six-step enterprise pattern: source type → owner & credential reference → endpoint → schemas → ingestion mode → review. This draft never accepts secret values.</div>
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><div className="page-eyebrow">Enterprise connection wizard · step {wizardStep + 1}/6</div><DialogTitle>Create governed connection</DialogTitle><DialogDescription>No password, token or secret value is accepted. Use fictional credential-reference metadata only.</DialogDescription></DialogHeader><div className="grid grid-cols-6 gap-1">{['Source','Ownership','Endpoint','Schemas','Ingestion','Review'].map((step,index)=><div key={step} className={`rounded p-2 text-center text-[9px] font-semibold ${index===wizardStep?'bg-cyan-700 text-white':index<wizardStep?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-500'}`}>{index+1}. {step}</div>)}</div><div className="min-h-44 rounded-lg border bg-slate-50 p-4"><h3 className="text-sm font-semibold">{['Select source technology','Assign workspace and owner','Configure safe endpoint metadata','Choose schemas and tables','Define batch or CDC mode','Validate and review'][wizardStep]}</h3><p className="mt-2 text-xs text-slate-500">Design assumption: this step stores deterministic mock configuration only and produces an auditable mock operation.</p><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-[10px] uppercase text-slate-500">Configuration label<input className="mt-1 block h-9 w-full rounded-md border bg-white px-3 text-xs" defaultValue={wizardStep===0?'JDBC / Object Storage / API':'Fictional BA value'} /></label><label className="text-[10px] uppercase text-slate-500">Validation state<input className="mt-1 block h-9 w-full rounded-md border bg-white px-3 text-xs" value="Ready for mock validation" readOnly /></label></div></div><DialogFooter><Button variant="outline" onClick={()=>wizardStep===0?setWizardOpen(false):setWizardStep((step)=>step-1)}>{wizardStep===0?'Cancel':'Back'}</Button><Button onClick={()=>{ if(wizardStep===5){ toast.success('Connection wizard reviewed in mock mode.');setWizardOpen(false)}else setWizardStep((step)=>step+1)}}>{wizardStep===5?'Complete mock review':'Continue'}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
