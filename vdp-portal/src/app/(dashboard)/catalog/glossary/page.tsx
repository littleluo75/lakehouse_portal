import { requireAuth } from '@/lib/require-auth'
import { GlossaryBrowser } from '@/components/modules/openmetadata/glossary-browser'

export default async function GlossaryPage() {
  await requireAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  return <GlossaryBrowser />
}
