import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { KeycloakRole, IUser } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hasRole(user: IUser | null, roles: KeycloakRole[]): boolean {
  if (!user) return false
  if (roles.length === 0) return true
  return roles.some(role => user.roles.includes(role))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}
