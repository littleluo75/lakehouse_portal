import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { BA_DRAFT_BANNER_TEXT } from '@/lib/ba-draft/config'
import { PERSONAS, WORKSPACES } from '@/lib/ba-draft/fixtures/seed'

export const GET = createBaDraftHandler(async ({ persona, workspace }) => {
  return NextResponse.json({
    banner: BA_DRAFT_BANNER_TEXT,
    persona,
    workspace,
    personas: PERSONAS,
    workspaces: WORKSPACES,
  })
})
