import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SpeakingFeedback } from '@/lib/types'

const MAX_KEPT = 30

interface SpeakingResultsState {
  results: Record<string, SpeakingFeedback>
  save: (submissionId: string, feedback: SpeakingFeedback) => void
}

export const useSpeakingResultsStore = create<SpeakingResultsState>()(
  persist(
    (set) => ({
      results: {},
      save: (submissionId, feedback) =>
        set((state) => {
          const entries = Object.entries({ ...state.results, [submissionId]: feedback })
          return { results: Object.fromEntries(entries.slice(-MAX_KEPT)) }
        }),
    }),
    { name: 'ielts-speaking-results' },
  ),
)
