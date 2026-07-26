import { NextResponse } from 'next/server'
import { createBaDraftHandler } from '@/lib/ba-draft/route-handler'
import { fixtureStore } from '@/lib/ba-draft/fixtures/store'

export const GET = createBaDraftHandler(async () => {
  const { catalogEntries, datasets } = fixtureStore.get()
  const items = catalogEntries.map((entry) => ({
    ...entry,
    dataset: datasets.find((d) => d.id === entry.datasetId),
  }))
  return NextResponse.json({ items })
})
