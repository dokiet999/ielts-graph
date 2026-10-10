import type { AnswerValue, Question } from './types'

/** Normalises free-text answers: case, surrounding spaces, repeated spaces, final full stop. */
export function normalizeText(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '')
}

/**
 * Grades one question. `question.options[].isCorrect` must be present (server side / mock only).
 * FILL_BLANK accepts any option text marked correct; choice questions need the exact set of
 * correct option ids.
 */
export function gradeQuestion(question: Question, answer: AnswerValue | undefined): boolean {
  if (answer === undefined) return false
  const correct = question.options.filter((o) => o.isCorrect)
  if (question.questionType === 'FILL_BLANK') {
    if (typeof answer !== 'string' || !answer.trim()) return false
    const given = normalizeText(answer)
    return correct.some((o) => normalizeText(o.optionText) === given)
  }
  const ids = Array.isArray(answer) ? answer : [answer]
  if (ids.length !== correct.length) return false
  return correct.every((o) => ids.includes(o.id))
}

/** Splits a FILL_BLANK question text around its blank (a run of 3+ underscores). */
export function splitBlank(text: string): [string, string] | null {
  const m = /_{3,}/.exec(text)
  if (!m) return null
  return [text.slice(0, m.index), text.slice(m.index + m[0].length)]
}
