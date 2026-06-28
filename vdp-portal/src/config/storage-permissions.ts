import type { KeycloakRole } from '@/types'

// Mỗi role được phép đọc những buckets nào
export const BUCKET_ACCESS: Record<KeycloakRole, string[]> = {
  SuperAdmin: ['iceberg-warehouse', 'spark-events'],
  Admin:      ['iceberg-warehouse', 'spark-events'],
  Op:         ['iceberg-warehouse', 'spark-events'],
  DE:         ['iceberg-warehouse', 'spark-events'],
  DS:         ['iceberg-warehouse'],
  DA:         ['iceberg-warehouse'],
  BA:         [],         // BA không truy cập storage trực tiếp
  PM:         [],
  Viewer:     [],
}

export function isBucketAllowed(roles: KeycloakRole[], bucket: string): boolean {
  return roles.some(role => BUCKET_ACCESS[role]?.includes(bucket))
}
