import type { AnswerValue, Question, QuestionGroup, QuestionResult } from '@/lib/types'

export interface QuestionProps {
  question: Question
  group?: QuestionGroup
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
  /** Present in review mode: inputs become read-only and correct answers are shown. */
  result?: QuestionResult
}

export interface GroupAnswerProps {
  group: QuestionGroup
  answers: Record<string, AnswerValue>
  onChange: (questionId: string, value: AnswerValue) => void
  results?: Record<string, QuestionResult>
}
