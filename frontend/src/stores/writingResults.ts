import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WritingFeedback } from '@/lib/types'

const MAX_KEPT = 30

interface WritingResultsState {
  /** Feedback by submission id, in the order it was received (oldest first). */
  results: Record<string, WritingFeedback>
  save: (submissionId: string, feedback: WritingFeedback) => void
}

/**
 * The backend only returns the structured feedback in the response of the submit call, not when
 * the submission is opened again. Keeping the last results here lets the result page survive a
 * reload until the backend returns it from GET /submissions/{id}/detail.
 */
export const useWritingResultsStore = create<WritingResultsState>()(
  persist(
    (set) => ({
      results: {},
      save: (submissionId, feedback) =>
        set((state) => {
          const entries = Object.entries({ ...state.results, [submissionId]: feedback })
          return { results: Object.fromEntries(entries.slice(-MAX_KEPT)) }
        }),
    }),
    { name: 'ielts-writing-results' },
  ),
)
