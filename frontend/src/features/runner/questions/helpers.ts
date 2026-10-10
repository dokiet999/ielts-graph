import type { AnswerValue, Question, QuestionGroup } from '@/lib/types'

export const letter = (i: number) => String.fromCharCode(65 + i)

/** Option texts in the data often start with their own letter ("B. The soil ..."). */
export function splitOptionLabel(text: string, index: number): { label: string; text: string } {
  const m = /^([A-Z])\.\s+(.*)$/s.exec(text)
  return m ? { label: m[1], text: m[2] } : { label: letter(index), text }
}

const COUNT_WORDS: Record<string, number> = { TWO: 2, THREE: 3, FOUR: 4 }

/** "Choose TWO letters" → 2. Single choice otherwise. */
export function maxSelections(question: Question, group?: QuestionGroup) {
  if (question.questionType !== 'MULTIPLE_CHOICE') return 1
  const text = `${group?.groupInstruction ?? ''} ${question.questionText}`
  const m = /\b(TWO|THREE|FOUR)\b/.exec(text)
  return m ? COUNT_WORDS[m[1]] : 1
}

export const asArray = (v: AnswerValue | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : v ? [v] : []

export const asText = (v: AnswerValue | undefined): string => (typeof v === 'string' ? v : '')

/** Learner-facing text of an answer, e.g. "B, D" or the typed word. */
export function describeAnswer(question: Question, value: AnswerValue | undefined) {
  if (question.questionType === 'FILL_BLANK') return asText(value).trim() || '—'
  const ids = asArray(value)
  if (!ids.length) return '—'
  return question.options
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => ids.includes(o.id))
    .map(({ o, i }) => shortOption(question, o.optionText, i))
    .join(', ')
}

export function describeCorrect(question: Question) {
  const correct = question.options.map((o, i) => ({ o, i })).filter(({ o }) => o.isCorrect)
  if (question.questionType === 'FILL_BLANK')
    return correct.map(({ o }) => o.optionText).join(' / ')
  return correct.map(({ o, i }) => shortOption(question, o.optionText, i)).join(', ')
}

function shortOption(question: Question, text: string, index: number) {
  if (question.questionType === 'MULTIPLE_CHOICE') return splitOptionLabel(text, index).label
  if (question.questionType === 'DROPLIST') return text.split('.')[0]
  return text
}
