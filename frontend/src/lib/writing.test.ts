import { describe, expect, it } from 'vitest'
import type { WritingEvidence } from './types'
import {
  bandTone,
  countWords,
  errorLabel,
  evidenceHighlights,
  isRetryableWritingError,
  writingMinWords,
  writingSubmitMessage,
} from './writing'

const evidence = (quote: string): WritingEvidence => ({
  quote,
  errorType: 'ERR_ARTICLE',
  suggestion: '',
})

describe('countWords', () => {
  it('counts words separated by any whitespace, like the backend', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n ')).toBe(0)
    expect(countWords('one')).toBe(1)
    expect(countWords('  one two\nthree\t four  ')).toBe(4)
  })
})

describe('writingMinWords', () => {
  it('asks 250 words for Task 2 and 150 for Task 1', () => {
    expect(writingMinWords('QT_W2_DISCUSSION')).toBe(250)
    expect(writingMinWords(null)).toBe(250)
    expect(writingMinWords('QT_W1_LINE_GRAPH')).toBe(150)
  })
})

describe('labels', () => {
  it('translates known error codes and shows unknown ones as they are', () => {
    expect(errorLabel('ERR_COLLOCATION')).toBe('Sai collocation')
    expect(errorLabel('ERR_SOMETHING_NEW')).toBe('ERR_SOMETHING_NEW')
  })

  it('colors the band by level', () => {
    expect(bandTone(7)).toBe('success')
    expect(bandTone(6)).toBe('warning')
    expect(bandTone(5)).toBe('danger')
  })
})

describe('submit errors', () => {
  it('has a Vietnamese message for the backend codes', () => {
    expect(writingSubmitMessage('LLM_UNAVAILABLE', 503)).toMatch(/quá tải/)
    expect(writingSubmitMessage('MAX_ATTEMPTS_REACHED', 409)).toMatch(/hết số lần/)
    expect(writingSubmitMessage('ESSAY_TOO_SHORT', 400)).toMatch(/50 từ/)
  })

  it('treats an invalid AI answer (502) as a retry, and unknown codes as unknown', () => {
    expect(writingSubmitMessage('SCHEMA_VALIDATION_ERROR', 502)).toMatch(/thử nộp lại/)
    expect(writingSubmitMessage('SOMETHING', 500)).toBeUndefined()
  })

  it('retries only when the AI side failed', () => {
    expect(isRetryableWritingError('LLM_UNAVAILABLE', 503)).toBe(true)
    expect(isRetryableWritingError('LLM_TIMEOUT', 502)).toBe(true)
    expect(isRetryableWritingError('MAX_ATTEMPTS_REACHED', 409)).toBe(false)
    expect(isRetryableWritingError('ESSAY_TOO_SHORT', 400)).toBe(false)
  })
})

describe('evidenceHighlights', () => {
  const essay = 'I think that a technology is useful.\nMoreover, it’s fast and cheap.'

  it('finds each quote and keeps the index of its evidence in the id', () => {
    const list = evidenceHighlights(essay, [evidence('a technology'), evidence('fast and cheap')])
    expect(list.map((h) => h.id)).toEqual(['e-0', 'e-1'])
    expect(essay.slice(list[0].start, list[0].end)).toBe('a technology')
    expect(essay.slice(list[1].start, list[1].end)).toBe('fast and cheap')
  })

  it('matches like the backend: any case, any whitespace, curly or straight quotes', () => {
    const list = evidenceHighlights(essay, [evidence("MOREOVER, IT'S   fast")])
    expect(list).toHaveLength(1)
    expect(essay.slice(list[0].start, list[0].end)).toBe('Moreover, it’s fast')
    const wrapped = evidenceHighlights(essay, [evidence('technology is useful. Moreover')])
    expect(essay.slice(wrapped[0].start, wrapped[0].end)).toBe('technology is useful.\nMoreover')
  })

  it('skips quotes that are missing, blank or overlapping an earlier quote', () => {
    const list = evidenceHighlights(essay, [
      evidence('a technology is'),
      evidence('technology is useful'),
      evidence('not in the essay'),
      evidence('  '),
      evidence('cheap'),
    ])
    expect(list.map((h) => h.id)).toEqual(['e-0', 'e-4'])
  })

  it('does not break on regex characters inside a quote', () => {
    expect(evidenceHighlights('cost (US$) is 5.5+', [evidence('(US$) is 5.5+')])).toHaveLength(1)
  })
})
