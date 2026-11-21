import { describe, expect, it } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { personalizationFixture } from '@/mocks/fixtures/personalization'
import {
  criterionHint,
  masteryLevel,
  personalizationErrorMessage,
  weaknessMessage,
} from './personalization'

const writing = personalizationFixture({ WRITING: 7 }).skills[0]
const byId = (id: string) => writing.weaknesses.find((w) => w.errorType.id === id)!

describe('masteryLevel', () => {
  it('uses the cut-offs of the learner profile rules', () => {
    expect(masteryLevel(null)).toBe('unknown')
    expect(masteryLevel(0.39)).toBe('weak')
    expect(masteryLevel(0.4)).toBe('developing')
    expect(masteryLevel(0.65)).toBe('strong')
  })
})

describe('weaknessMessage', () => {
  it('explains a weak error with its recent rate and the criterion against the target', () => {
    expect(weaknessMessage(byId('ERR_COLLOCATION'))).toBe(
      'Lỗi này xuất hiện trong 2/3 bài gần nhất (tổng 6 bài) và làm giảm tiêu chí Lexical Resource (đang 6.0, mục tiêu 7.0).',
    )
  })

  it('counts the clean attempts still needed for an improving error', () => {
    expect(weaknessMessage(byId('ERR_VERB_TENSE'))).toBe(
      '1 bài gần nhất không còn lỗi này. Giữ thêm 2 bài nữa để được tính là đã ổn.',
    )
  })

  it('confirms a resolved error', () => {
    expect(weaknessMessage(byId('ERR_ARTICLE'))).toBe('Không còn xuất hiện trong 4 bài gần nhất.')
  })
})

describe('criterionHint', () => {
  it('has a hint for every IELTS criterion and a fallback', () => {
    expect(criterionHint('CRIT_W_LR')).toMatch(/collocation/)
    expect(criterionHint('CRIT_X')).toMatch(/mô tả band/)
  })
})

describe('personalizationErrorMessage', () => {
  it('names the Knowledge Graph when it is down', () => {
    const error = new AxiosError('fail', 'ERR_BAD_RESPONSE', undefined, undefined, {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { code: 'KG_UNAVAILABLE' },
    })
    expect(personalizationErrorMessage(error)).toMatch(/Knowledge Graph/)
    expect(personalizationErrorMessage(new Error('x'))).toMatch(/Chưa tải được/)
  })
})
