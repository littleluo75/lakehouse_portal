import { PipelinesClient } from '@/components/product/pipelines/pipelines-client'

export default function PipelinesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Pipelines</h1>
      <PipelinesClient />
    </div>
  )
}
