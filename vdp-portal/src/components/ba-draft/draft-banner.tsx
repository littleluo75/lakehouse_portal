import { BA_DRAFT_BANNER_TEXT } from '@/lib/ba-draft/config'

/**
 * Persistent, non-dismissible — intentionally has no close button and no
 * client-side state. It cannot be hidden by the user.
 */
export function DraftBanner() {
  return (
    <div
      role="status"
      data-testid="ba-draft-banner"
      className="w-full bg-amber-500 text-amber-950 text-center text-sm font-semibold py-1.5 px-4 sticky top-0 z-[100] border-b border-amber-600"
    >
      {BA_DRAFT_BANNER_TEXT}
    </div>
  )
}
