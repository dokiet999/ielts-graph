import { describe, expect, it } from 'vitest'
import { fakeWritingFeedback, overallBand } from './writingGrader'

const sentence = 'Online learning gives students a lot of freedom to study. '
const essayOf = (sentences: number) => sentence.repeat(sentences).trim()

describe('overallBand', () => {
  it('is the mean of the criterion bands rounded to 0.5', () => {
    expect(overallBand([6, 6, 6, 6])).toBe(6)
    expect(overallBand([6, 6, 7, 6])).toBe(6.5) // 6.25
    expect(overallBand([7, 7, 6, 7])).toBe(7) // 6.75
    expect(overallBand([6, 6, 7, 7])).toBe(6.5)
  })
})

describe('fakeWritingFeedback', () => {
  it('gives integer criterion bands and an overall band that matches them', () => {
    const feedback = fakeWritingFeedback(essayOf(30), 'QT_W2_DISCUSSION')
    const bands = Object.values(feedback.criteria ?? {}).map((c) => Number(c.band))
    expect(bands).toHaveLength(4)
    expect(bands.every(Number.isInteger)).toBe(true)
    expect(feedback.overall_band).toBe(overallBand(bands))
  })

  it('quotes only text that is in the essay', () => {
    const essay = essayOf(30)
    const evidence = Object.values(
      fakeWritingFeedback(essay, 'QT_W2_DISCUSSION').criteria ?? {},
    ).flatMap((c) => c.evidence ?? [])
    expect(evidence.length).toBeGreaterThan(0)
    for (const e of evidence) expect(essay).toContain(e.quote)
  })

  it('warns below 250 words and not above', () => {
    const short = fakeWritingFeedback(essayOf(10), 'QT_W2_DISCUSSION')
    const long = fakeWritingFeedback(essayOf(30), 'QT_W2_DISCUSSION')
    expect(short.improvements?.[0]).toMatch(/250 từ/)
    expect(long.improvements?.join(' ')).not.toMatch(/250 từ/)
  })
})
