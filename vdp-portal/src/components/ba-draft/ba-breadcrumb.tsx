'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

export function BaBreadcrumb() {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  return <div className="breadcrumb"><Link href="/">Data Platform</Link>{parts.map((part, index) => <span key={`${part}-${index}`}><ChevronRight />{part.replaceAll('-', ' ')}</span>)}</div>
}
