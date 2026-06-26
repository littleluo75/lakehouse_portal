'use client'

import { LogOut, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from 'next-auth/react'

interface HeaderProps {
  userName?: string
  userEmail?: string
}

export function Header({ userName, userEmail }: HeaderProps) {
  const initials = userName
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U'

  return (
    <header className="fixed top-0 right-0 left-60 h-16 bg-white border-b border-slate-200 flex items-center justify-end px-6 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 h-9 px-2 rounded-md hover:bg-slate-100 transition-colors">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-slate-200">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{userName ?? userEmail}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled>
            <User className="h-3 w-3 mr-2" />
            <span className="text-xs">{userEmail}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-600 cursor-pointer"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
