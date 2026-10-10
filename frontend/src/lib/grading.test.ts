import { describe, expect, it } from 'vitest'
import { gradeQuestion, normalizeText, splitBlank } from './grading'
import type { Question } from './types'

const question = (
  questionType: Question['questionType'],
  options: [string, boolean][],
): Question => ({
  id: 'q1',
  number: 1,
  questionText: 'x',
  questionType,
  points: 1,
  options: options.map(([optionText, isCorrect], i) => ({
    id: `o${i + 1}`,
    optionText,
    isCorrect,
    ordering: i + 1,
  })),
})

describe('gradeQuestion', () => {
  it('grades single choice by option id', () => {
    const q = question('MULTIPLE_CHOICE', [
      ['A', false],
      ['B', true],
    ])
    expect(gradeQuestion(q, ['o2'])).toBe(true)
    expect(gradeQuestion(q, ['o1'])).toBe(false)
    expect(gradeQuestion(q, undefined)).toBe(false)
  })

  it('needs the exact set for "choose TWO" questions', () => {
    const q = question('MULTIPLE_CHOICE', [
      ['A', true],
      ['B', false],
      ['C', true],
    ])
    expect(gradeQuestion(q, ['o3', 'o1'])).toBe(true)
    expect(gradeQuestion(q, ['o1'])).toBe(false)
    expect(gradeQuestion(q, ['o1', 'o2'])).toBe(false)
  })

  it('accepts any correct spelling for fill-in-the-blank, ignoring case and spaces', () => {
    const q = question('FILL_BLANK', [
      ['493826', true],
      ['493 826', true],
    ])
    expect(gradeQuestion(q, ' 493 826 ')).toBe(true)
    expect(gradeQuestion(q, '493826')).toBe(true)
    expect(gradeQuestion(q, '493827')).toBe(false)
    expect(gradeQuestion(q, '')).toBe(false)
    expect(gradeQuestion(question('FILL_BLANK', [['Sponge', true]]), 'sponge.')).toBe(true)
  })
})

describe('text helpers', () => {
  it('normalises answers', () => {
    expect(normalizeText('  Third   Floor. ')).toBe('third floor')
  })

  it('splits a question around its blank', () => {
    expect(splitBlank('Surname: ______')).toEqual(['Surname: ', ''])
    expect(splitBlank('A layer holds water like a ______, which helps.')).toEqual([
      'A layer holds water like a ',
      ', which helps.',
    ])
    expect(splitBlank('No blank here')).toBeNull()
  })
})
