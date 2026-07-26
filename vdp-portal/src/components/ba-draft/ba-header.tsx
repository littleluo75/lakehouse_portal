import { PersonaSwitcher } from './persona-switcher'
import { WorkspaceSwitcher } from './workspace-switcher'
import { ResetDemoDataButton } from './reset-demo-data-button'
import { PERSONAS, WORKSPACES } from '@/lib/ba-draft/fixtures/seed'
import type { BaDraftIdentity } from '@/lib/ba-draft/session'

export function BaHeader({ identity }: { identity: BaDraftIdentity }) {
  return (
    <header
      className="fixed right-0 left-60 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-40"
      style={{ top: '2rem' }}
    >
      <div />
      <div className="flex items-center gap-2">
        <ResetDemoDataButton />
        <WorkspaceSwitcher workspaces={WORKSPACES} currentWorkspaceId={identity.workspace.id} />
        <PersonaSwitcher personas={PERSONAS} currentPersonaId={identity.persona.id} />
      </div>
    </header>
  )
}
