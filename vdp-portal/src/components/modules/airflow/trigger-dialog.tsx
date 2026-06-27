'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { DAG } from '@/types/airflow'

interface TriggerDialogProps {
  dag: DAG | null
  onClose: () => void
  onConfirm: (dagId: string, conf: Record<string, unknown>) => void
  isPending: boolean
}

export function TriggerDialog({ dag, onClose, onConfirm, isPending }: TriggerDialogProps) {
  const [confText, setConfText] = useState('{}')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const open = !!dag

  function handleConfirm() {
    setJsonError(null)
    let conf: Record<string, unknown> = {}
    const trimmed = confText.trim()
    if (trimmed && trimmed !== '{}') {
      try {
        const parsed: unknown = JSON.parse(trimmed)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setJsonError('Config phải là JSON object')
          return
        }
        conf = parsed as Record<string, unknown>
      } catch {
        setJsonError('JSON không hợp lệ')
        return
      }
    }
    onConfirm(dag!.dag_id, conf)
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      setConfText('{}')
      setJsonError(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md z-[60]">
        <DialogHeader>
          <DialogTitle>Trigger DAG</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-600">
            Kích hoạt DAG{' '}
            <span className="font-mono font-semibold text-slate-900">{dag?.dag_id}</span>?
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">
              Config JSON (tuỳ chọn)
            </label>
            <Textarea
              value={confText}
              onChange={(e) => {
                setConfText(e.target.value)
                setJsonError(null)
              }}
              rows={4}
              className="font-mono text-xs"
              placeholder="{}"
            />
            {jsonError && (
              <p className="text-xs text-red-600">{jsonError}</p>
            )}
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Đang kích hoạt…' : 'Kích hoạt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
