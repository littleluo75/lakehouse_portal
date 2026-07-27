import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const routeFiles = [
  resolve(process.cwd(), 'src/app/(dashboard)/catalog/[id]/page.tsx'),
  resolve(process.cwd(), 'src/app/(dashboard)/catalog/glossary/page.tsx'),
]

describe('BA Draft catalog route safety', () => {
  test.each(routeFiles)('%s checks BA Draft mode before real authentication', (file) => {
    const source = readFileSync(file, 'utf8')
    const guardIndex = source.indexOf('if (isBaDraftMode())')
    const authIndex = source.indexOf('await requireAuth(')

    expect(guardIndex).toBeGreaterThan(-1)
    expect(authIndex).toBeGreaterThan(guardIndex)
  })
})
