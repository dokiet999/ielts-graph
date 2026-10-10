import { describe, expect, it } from 'vitest'
import { allQuestions, gradeExercise } from './db'
import { exercises } from './fixtures/courses'

describe('mock fixtures', () => {
  it('loads the shared sample exercises from data/exercises', () => {
    const reading = exercises.find((e) => e.id === 'ex-reading-01')!
    const listening = exercises.find((e) => e.id === 'ex-listening-01')!
    expect(reading.skillType).toBe('READING')
    expect(allQuestions(reading)).toHaveLength(13)
    expect(listening.skillType).toBe('LISTENING')
    expect(allQuestions(listening).map((q) => q.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('gives every question and option a unique id', () => {
    const ids = exercises.flatMap((e) =>
      allQuestions(e).flatMap((q) => [q.id, ...q.options.map((o) => o.id)]),
    )
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has at least one correct option for every question', () => {
    for (const e of exercises) {
      for (const q of allQuestions(e))
        expect(
          q.options.some((o) => o.isCorrect),
          q.id,
        ).toBe(true)
    }
  })
})

describe('gradeExercise', () => {
  it('scores a perfect attempt at full marks', () => {
    const ex = exercises.find((e) => e.id === 'ex-reading-01')!
    const answers = Object.fromEntries(
      allQuestions(ex).map((q) => [
        q.id,
        q.questionType === 'FILL_BLANK'
          ? q.options.find((o) => o.isCorrect)!.optionText
          : q.options.filter((o) => o.isCorrect).map((o) => o.id),
      ]),
    )
    const result = gradeExercise(ex, answers)
    expect(result.correctCount).toBe(13)
    expect(result.score).toBe(result.maxScore)
  })

  it('counts unanswered questions as wrong', () => {
    const ex = exercises.find((e) => e.id === 'ex-listening-01')!
    const result = gradeExercise(ex, {})
    expect(result.correctCount).toBe(0)
    expect(result.results.every((r) => !r.correct)).toBe(true)
  })
})
