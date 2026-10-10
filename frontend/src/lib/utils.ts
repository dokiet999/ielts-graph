import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { DifficultyLevel, ExerciseType, SkillType } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 1250 → "20:50", 3725 → "1:02:05". */
export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** Course length is stored in minutes: 45 → "45 phút", 600 → "10 giờ", 90 → "1 giờ 30 phút". */
export function formatMinutes(totalMinutes: number) {
  const m = Math.max(0, Math.round(totalMinutes))
  if (m < 60) return `${m} phút`
  const hours = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`
}

/** 1250 → "20 phút 50 giây". */
export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  if (m === 0) return `${sec} giây`
  return sec ? `${m} phút ${sec} giây` : `${m} phút`
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const SKILL_LABEL: Record<SkillType, string> = {
  READING: 'Reading',
  LISTENING: 'Listening',
  WRITING: 'Writing',
  SPEAKING: 'Speaking',
}

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  LESSON: 'Bài tập nhanh',
  PRACTICE: 'Luyện tập',
  MOCK_TEST: 'Thi thử',
}

export const LEVEL_LABEL: Record<DifficultyLevel, string> = {
  BEGINNER: 'Beginner',
  ELEMENTARY: 'Elementary',
  INTERMEDIATE: 'Intermediate',
  UPPER_INTERMEDIATE: 'Upper-Intermediate',
  ADVANCED: 'Advanced',
}

export function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}
