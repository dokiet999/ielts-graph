import type { ContentStatus, Role, UserStatus } from './types'

export type BadgeTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'primary'

export const CONTENT_STATUS_META: Record<ContentStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  PENDING_REVIEW: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
}

export const USER_STATUS_META: Record<UserStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  ACTIVE: { label: 'Đang hoạt động', tone: 'success' },
  LOCKED: { label: 'Đã khóa', tone: 'danger' },
}

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Học viên',
  TEACHER: 'Giảng viên',
  ADMIN: 'Quản trị viên',
}

export function homePathForRole(role?: Role): string {
  if (role === 'ADMIN') return '/admin'
  if (role === 'TEACHER') return '/teacher'
  return '/'
}
