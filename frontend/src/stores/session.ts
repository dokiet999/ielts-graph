import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnswerValue, Answers, CheckAnswerResponse } from '@/lib/types'
import type { Highlight } from '@/lib/highlight'

/** In-progress attempt of one exercise, kept in localStorage so a reload does not lose work. */
export interface ExerciseSession {
  answers: Answers
  flags: string[]
  highlights: Highlight[]
  /** Seconds spent while the runner was open (the timer pauses when the learner leaves). */
  elapsed: number
  /** True once the learner clicks "Bắt đầu" and has not submitted yet. */
  inProgress?: boolean
  /**
   * Epoch ms when a wall-clock timed test (FINAL_TEST) started. When set, the timer keeps
   * ticking in real time even if the learner exits the runner.
   */
  startedAt?: number
  /** QuizRunner only: index of the current question and questions already checked. */
  quizIndex: number
  checked: Record<string, CheckAnswerResponse>
  /** Shown in "Tiếp tục làm bài" lists without refetching the exercise. */
  title: string
  questionCount: number
  updatedAt: number
}

export interface SessionMeta {
  title: string
  questionCount: number
}

const emptySession = (meta?: SessionMeta): ExerciseSession => ({
  answers: {},
  flags: [],
  highlights: [],
  elapsed: 0,
  quizIndex: 0,
  checked: {},
  title: meta?.title ?? '',
  questionCount: meta?.questionCount ?? 0,
  updatedAt: Date.now(),
})

interface SessionState {
  sessions: Record<string, ExerciseSession>
  ensure: (exerciseId: string, meta: SessionMeta) => void
  markInProgress: (exerciseId: string) => void
  markStartedWallClock: (exerciseId: string, startedAtMs: number) => void
  setAnswer: (exerciseId: string, questionId: string, value: AnswerValue) => void
  toggleFlag: (exerciseId: string, questionId: string) => void
  setHighlights: (exerciseId: string, highlights: Highlight[]) => void
  setElapsed: (exerciseId: string, elapsed: number) => void
  setQuizIndex: (exerciseId: string, index: number) => void
  markChecked: (exerciseId: string, questionId: string, result: CheckAnswerResponse) => void
  clear: (exerciseId: string) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => {
      const patch = (exerciseId: string, fn: (s: ExerciseSession) => Partial<ExerciseSession>) =>
        set((state) => {
          const current = state.sessions[exerciseId] ?? emptySession()
          return {
            sessions: {
              ...state.sessions,
              [exerciseId]: { ...current, ...fn(current), updatedAt: Date.now() },
            },
          }
        })

      return {
        sessions: {},
        ensure: (exerciseId, meta) =>
          set((state) => {
            const current = state.sessions[exerciseId]
            return {
              sessions: {
                ...state.sessions,
                [exerciseId]: current ? { ...current, ...meta } : emptySession(meta),
              },
            }
          }),
        setAnswer: (exerciseId, questionId, value) =>
          patch(exerciseId, (s) => ({
            inProgress: true,
            answers: { ...s.answers, [questionId]: value },
          })),
        markInProgress: (exerciseId) => patch(exerciseId, () => ({ inProgress: true })),
        markStartedWallClock: (exerciseId, startedAtMs) =>
          patch(exerciseId, (s) => ({
            inProgress: true,
            startedAt: s.startedAt ?? startedAtMs,
            elapsed: Math.max(0, Math.floor((Date.now() - (s.startedAt ?? startedAtMs)) / 1000)),
          })),
        toggleFlag: (exerciseId, questionId) =>
          patch(exerciseId, (s) => ({
            flags: s.flags.includes(questionId)
              ? s.flags.filter((f) => f !== questionId)
              : [...s.flags, questionId],
          })),
        setHighlights: (exerciseId, highlights) => patch(exerciseId, () => ({ highlights })),
        setElapsed: (exerciseId, elapsed) => patch(exerciseId, () => ({ elapsed })),
        setQuizIndex: (exerciseId, quizIndex) => patch(exerciseId, () => ({ quizIndex })),
        markChecked: (exerciseId, questionId, result) =>
          patch(exerciseId, (s) => ({ checked: { ...s.checked, [questionId]: result } })),
        clear: (exerciseId) =>
          set((state) => {
            const sessions = { ...state.sessions }
            delete sessions[exerciseId]
            return { sessions }
          }),
      }
    },
    { name: 'ielts-sessions' },
  ),
)

export function isAnswered(value: AnswerValue | undefined) {
  if (value === undefined) return false
  return Array.isArray(value) ? value.length > 0 : value.trim() !== ''
}

/** Number of answered questions in a saved session, used for the "Đang làm x/N" badge. */
export function answeredCount(session: ExerciseSession | undefined) {
  if (!session) return 0
  return Object.values(session.answers).filter(isAnswered).length
}

/** True when the learner has started the test or answered at least one question without submitting. */
export function isInProgress(session: ExerciseSession | undefined) {
  if (!session) return false
  return Boolean(session.inProgress) || answeredCount(session) > 0
}
