import { PersonaSwitcher } from './persona-switcher'
import { WorkspaceSwitcher } from './workspace-switcher'
import { ResetDemoDataButton } from './reset-demo-data-button'
import { PERSONAS, WORKSPACES } from '@/lib/ba-draft/fixtures/seed'
import type { BaDraftIdentity } from '@/lib/ba-draft/session'
import { Bell, CheckCircle2, Search } from 'lucide-react'
import { BaBreadcrumb } from './ba-breadcrumb'

export function BaHeader({ identity }: { identity: BaDraftIdentity }) {
  return (
    <header className="ba-header">
      <div className="header-left">
        <BaBreadcrumb />
        <label className="global-search"><Search /><input aria-label="Tìm kiếm toàn cục" placeholder="Tìm dataset, pipeline, operation…" /><kbd>⌘ K</kbd></label>
      </div>
      <div className="header-actions">
        <div className="platform-health"><CheckCircle2 /><span><strong>Platform healthy</strong><small>4/5 services</small></span></div>
        <button className="notification-button" aria-label="Thông báo"><Bell /><span>3</span></button>
        <ResetDemoDataButton />
        <WorkspaceSwitcher workspaces={WORKSPACES} currentWorkspaceId={identity.workspace.id} />
        <PersonaSwitcher personas={PERSONAS} currentPersonaId={identity.persona.id} />
      </div>
    </header>
  )
}
