import { describe, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import {
  bandParam,
  errorCodesOf,
  kgSkillOf,
  practicePath,
  recommendationsErrorMessage,
} from './recommendations'

const evidence = (...codes: string[]) => ({ evidence: codes.map((errorType) => ({ errorType })) })

describe('errorCodesOf', () => {
  it('keeps the first occurrence of each code, in feedback order', () => {
    expect(
      errorCodesOf([evidence('ERR_ARTICLE', 'ERR_PREP'), evidence('ERR_ARTICLE', 'ERR_SVA')]),
    ).toEqual(['ERR_ARTICLE', 'ERR_PREP', 'ERR_SVA'])
  })

  it('drops malformed codes and keeps at most 10', () => {
    expect(errorCodesOf([evidence('', 'article', ' ERR_PREP ')])).toEqual(['ERR_PREP'])
    const many = Array.from({ length: 12 }, (_, i) => `ERR_${String.fromCharCode(65 + i)}`)
    expect(errorCodesOf([evidence(...many)])).toHaveLength(10)
  })
})

describe('bandParam', () => {
  it('rounds the overall band down to the integer band the KG knows', () => {
    expect(bandParam(6.5)).toBe(6)
    expect(bandParam(7)).toBe(7)
    expect(bandParam(0)).toBeUndefined()
    expect(bandParam(null)).toBeUndefined()
    expect(bandParam(Number.NaN)).toBeUndefined()
  })
})

describe('practicePath', () => {
  it('opens exercises in the runner and nothing else', () => {
    expect(practicePath({ sqlRef: 'exercises:60000000-0000-0000-0000-000000000001' })).toBe(
      '/run/60000000-0000-0000-0000-000000000001',
    )
    expect(practicePath({ sqlRef: 'lessons:abc' })).toBeNull()
    expect(practicePath({ sqlRef: null })).toBeNull()
  })
})

describe('kgSkillOf', () => {
  it('maps only the AI-graded skills', () => {
    expect(kgSkillOf('WRITING')).toBe('SKILL_W')
    expect(kgSkillOf('SPEAKING')).toBe('SKILL_S')
    expect(kgSkillOf('READING')).toBeNull()
  })
})

describe('recommendationsErrorMessage', () => {
  it('explains that grading is not affected when the KG is down', () => {
    const down = new AxiosError('x', 'ERR_BAD_RESPONSE', undefined, undefined, {
      status: 503,
      data: { code: 'KG_UNAVAILABLE' },
    } as never)
    expect(recommendationsErrorMessage(down)).toContain('không bị ảnh hưởng')
    expect(recommendationsErrorMessage(new Error('x'))).toBe('Chưa tải được bài luyện gợi ý.')
  })
})
