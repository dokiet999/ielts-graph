import { describe, expect, it } from 'vitest'
import { estimateBand, formatBand } from './band'

describe('estimateBand', () => {
  it('maps a full 40-question test using the conversion table', () => {
    expect(estimateBand('LISTENING', 40, 40)).toBe(9)
    expect(estimateBand('LISTENING', 30, 40)).toBe(7)
    expect(estimateBand('READING', 30, 40)).toBe(7)
    expect(estimateBand('READING', 23, 40)).toBe(6)
    expect(estimateBand('READING', 0, 40)).toBe(0)
  })

  it('scales shorter exercises to 40 questions', () => {
    // 10/13 ≈ 31/40 → band 7 for Reading.
    expect(estimateBand('READING', 10, 13)).toBe(7)
    expect(estimateBand('LISTENING', 5, 10)).toBe(5.5)
  })

  it('returns null for unsupported skills or empty exercises', () => {
    expect(estimateBand('WRITING', 5, 10)).toBeNull()
    expect(estimateBand('READING', 0, 0)).toBeNull()
  })

  it('formats bands with one decimal', () => {
    expect(formatBand(6)).toBe('6.0')
    expect(formatBand(null)).toBe('—')
  })
})
