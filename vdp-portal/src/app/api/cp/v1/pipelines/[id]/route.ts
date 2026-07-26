import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { findPipeline } from '@/lib/ba-draft/fixtures/store'

export const GET = createBaDraftHandler(async ({ params }) => {
  const pipeline = findPipeline(params.id)
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 })
  }
  return NextResponse.json(pipeline)
})
