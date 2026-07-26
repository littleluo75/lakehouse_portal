'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingState } from '@/components/ba-draft/status-states'
import { productApi, ProductApiError } from '@/lib/product-api'
import type { FieldMapping, NodeMapping, PipelineNode } from '@/lib/ba-draft/fixtures/types'

interface MappingResponse {
  node: PipelineNode
  mapping: NodeMapping
}

/**
 * DEF-0001 correction. The mapping drawer is opened via an explicit
 * `nodeId` prop passed down from the parent's `openMapping(nodeId)` call
 * (see pipeline-detail-client.tsx) — never from a raw click/DOM event —
 * and every load/save call is keyed by that same node ID, so mapping state
 * can never drift onto the wrong node. Regression test:
 * tests/e2e/defects/def-0001-field-mapping.spec.ts.
 */
export function MappingDrawer({
  pipelineId,
  nodeId,
  onOpenChange,
}: {
  pipelineId: string
  nodeId: string | null
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<FieldMapping[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['ba-node-mapping', pipelineId, nodeId],
    queryFn: () => productApi.get<MappingResponse>(`/pipelines/${pipelineId}/nodes/${nodeId}/mapping`),
    enabled: nodeId !== null,
  })

  // Adjusting state from a prop/query change during render (not inside an
  // effect) per https://react.dev/learn/you-might-not-need-an-effect —
  // avoids a cascading-render effect while still resetting the draft
  // whenever the node being mapped changes.
  const currentKey = nodeId ? `${pipelineId}:${nodeId}` : null
  if (query.data && loadedKey !== currentKey) {
    setLoadedKey(currentKey)
    setDraft(query.data.mapping.mappings)
  }

  const saveMutation = useMutation({
    mutationFn: () => productApi.put(`/pipelines/${pipelineId}/nodes/${nodeId}/mapping`, { mappings: draft }),
    onSuccess: () => {
      toast.success('Đã lưu field mapping.')
      queryClient.invalidateQueries({ queryKey: ['ba-node-mapping', pipelineId, nodeId] })
      onOpenChange(false)
    },
    onError: (err) => toast.error(err instanceof ProductApiError ? err.message : 'Lưu mapping thất bại.'),
  })

  return (
    <Dialog open={nodeId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="mapping-drawer">
        <DialogHeader>
          <DialogTitle>Field mapping — node {nodeId}</DialogTitle>
          <DialogDescription>
            {query.data ? query.data.node.label : 'Đang tải node…'}
          </DialogDescription>
        </DialogHeader>

        {query.isLoading && <LoadingState label="Đang tải mapping…" />}

        {query.data && (
          <div className="space-y-2" data-testid="mapping-rows">
            {draft.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={row.sourceField}
                  placeholder="source field"
                  data-testid={`mapping-source-${i}`}
                  onChange={(e) => setDraft((d) => d.map((r, idx) => (idx === i ? { ...r, sourceField: e.target.value } : r)))}
                />
                <span className="text-slate-400">→</span>
                <Input
                  value={row.destField}
                  placeholder="dest field"
                  data-testid={`mapping-dest-${i}`}
                  onChange={(e) => setDraft((d) => d.map((r, idx) => (idx === i ? { ...r, destField: e.target.value } : r)))}
                />
                <Button variant="ghost" size="icon-sm" onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              data-testid="add-mapping-row"
              onClick={() => setDraft((d) => [...d, { sourceField: '', destField: '' }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Thêm dòng mapping
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
            Hủy
          </Button>
          <Button
            data-testid="save-mapping-button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || query.isLoading}
          >
            {saveMutation.isPending ? 'Đang lưu…' : 'Lưu mapping'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
