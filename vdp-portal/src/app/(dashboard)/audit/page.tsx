import { AuditClient } from '@/components/product/audit/audit-client'

export default function AuditPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Audit log</h1>
      <AuditClient />
    </div>
  )
}
