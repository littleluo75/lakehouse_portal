import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const modules = [
  { name: 'Workflows', href: '/workflows', status: 'coming-soon' },
  { name: 'Data Catalog', href: '/catalog', status: 'coming-soon' },
  { name: 'SQL Editor', href: '/query', status: 'coming-soon' },
  { name: 'Notebooks', href: '/notebooks', status: 'coming-soon' },
  { name: 'Storage', href: '/storage', status: 'coming-soon' },
  { name: 'Streams', href: '/streams', status: 'coming-soon' },
  { name: 'Spark Jobs', href: '/jobs', status: 'coming-soon' },
  { name: 'Observability', href: '/observability', status: 'coming-soon' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">VDP Portal</h1>
        <p className="text-slate-500 mt-1">Đang khởi động các modules — VNPT Data Platform</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map(mod => (
          <Card key={mod.href} className="hover:shadow-md transition-shadow cursor-default">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{mod.name}</CardTitle>
              <CardDescription>
                <Badge variant="secondary">Sắp ra mắt</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400">Module đang được phát triển</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
