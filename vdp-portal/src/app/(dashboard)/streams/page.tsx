// Kịch bản C: Kafka chưa được deploy trong lakehouse_infra (không có strimzi/ hoặc kafka-ui/).
// Trang placeholder — cập nhật lên Kịch bản A/B khi Kafka được deploy.
import { AlertCircle } from 'lucide-react'
import { requireAuth } from '@/lib/require-auth'

export default async function StreamsPage() {
  await requireAuth(['DE', 'Op', 'Admin', 'SuperAdmin'])

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <AlertCircle className="w-12 h-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Module Kafka chưa được cấu hình</h2>
      <p className="text-muted-foreground text-center">
        Kafka broker endpoint chưa được xác định trong hệ thống.<br />
        Vui lòng liên hệ Admin để cấu hình.
      </p>
    </div>
  )
}
