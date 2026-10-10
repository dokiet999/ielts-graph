import type { SkillType } from './types'

// Raw score (out of 40) → band, based on the commonly published IELTS conversion tables.
// Exercises shorter than a full test are scaled to 40, so the result is only an estimate.
const LISTENING: [number, number][] = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [32, 7.5],
  [30, 7],
  [26, 6.5],
  [23, 6],
  [18, 5.5],
  [16, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [2, 2],
  [1, 1],
]
const READING: [number, number][] = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [33, 7.5],
  [30, 7],
  [27, 6.5],
  [23, 6],
  [19, 5.5],
  [15, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [2, 2],
  [1, 1],
]

export function estimateBand(skill: SkillType, correct: number, total: number): number | null {
  if (total <= 0) return null
  if (skill !== 'LISTENING' && skill !== 'READING') return null
  const raw = Math.round((Math.min(correct, total) / total) * 40)
  const table = skill === 'LISTENING' ? LISTENING : READING
  for (const [min, band] of table) if (raw >= min) return band
  return 0
}

export function formatBand(band: number | null | undefined) {
  return band == null ? '—' : band.toFixed(1)
}
