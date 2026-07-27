import { requireAuth } from '@/lib/require-auth'
import { GlossaryBrowser } from '@/components/modules/openmetadata/glossary-browser'
import { DeferredRoutePlaceholder } from '@/components/ba-draft/deferred-route-placeholder'
import { isBaDraftMode } from '@/lib/ba-draft/config'

export default async function GlossaryPage() {
  if (isBaDraftMode()) {
    return (
      <DeferredRoutePlaceholder
        title="Business Glossary"
        note="Trang vẫn nằm trong ranh giới mock và không gọi OpenMetadata hoặc xác thực thật."
      />
    )
  }
  await requireAuth(['DE', 'DS', 'DA', 'BA', 'Admin', 'SuperAdmin'])
  return <GlossaryBrowser />
}
