import { describe, expect, it } from 'vitest'
import { formatMinutes } from './utils'

describe('formatMinutes', () => {
  it('formats course length given in minutes', () => {
    expect(formatMinutes(45)).toBe('45 phút')
    expect(formatMinutes(600)).toBe('10 giờ')
    expect(formatMinutes(90)).toBe('1 giờ 30 phút')
  })
})
