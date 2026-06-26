// User & Auth
export interface IUser {
  id: string
  name: string
  email: string
  roles: KeycloakRole[]
  accessToken: string
}

export type KeycloakRole =
  | 'SuperAdmin' | 'Admin' | 'Op' | 'PM'
  | 'DE' | 'DS' | 'DA' | 'BA' | 'Viewer'

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Navigation
export interface NavItem {
  title: string
  href: string
  icon: string
  roles: KeycloakRole[]  // empty array = all roles
}
