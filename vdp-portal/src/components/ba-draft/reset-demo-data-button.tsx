'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { productApi } from '@/lib/product-api'
import { toast } from 'sonner'

export function ResetDemoDataButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  async function handleReset() {
    try {
      await productApi.post('/ba-control/reset')
      toast.success('Đã khôi phục dữ liệu demo về trạng thái ban đầu.')
      startTransition(() => router.refresh())
    } catch {
      toast.error('Không thể khôi phục dữ liệu demo.')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      data-testid="reset-demo-data-button"
      onClick={handleReset}
      disabled={isPending}
    >
      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
      Reset demo data
    </Button>
  )
}
