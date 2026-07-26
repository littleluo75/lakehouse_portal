'use client'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({
  children,
  baDraftMode = false,
}: {
  children: React.ReactNode
  baDraftMode?: boolean
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30 * 1000, retry: 1 },
        },
      })
  )

  const content = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

  // BA Draft mode never uses next-auth (mock persona/workspace identity
  // instead — see src/lib/ba-draft/session.ts), and next-auth's
  // SessionProvider fetches /api/auth/session on mount, which BA Draft
  // mode's proxy correctly blocks as a legacy endpoint. Skipping the
  // provider avoids that fetch entirely instead of masking the block.
  if (baDraftMode) return content

  return <SessionProvider>{content}</SessionProvider>
}
