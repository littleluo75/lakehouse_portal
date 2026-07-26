import type { Metadata } from 'next'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'
import { DraftBanner } from '@/components/ba-draft/draft-banner'
import { isBaDraftMode } from '@/lib/ba-draft/config'
import './globals.css'

export const metadata: Metadata = {
  title: isBaDraftMode()
    ? 'VNPT Data Cloud Platform — BA Draft'
    : (process.env.NEXT_PUBLIC_APP_NAME ?? 'VNPT Data Lighthouse'),
  description: 'VNPT Data Lighthouse — Single Pane of Glass',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const draftMode = isBaDraftMode()
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {draftMode && <DraftBanner />}
        <Providers baDraftMode={draftMode}>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
