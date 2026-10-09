import { useMemo } from 'react'
import type { ExerciseSummary } from '@/lib/types'
import { answeredCount, useSessionStore, type ExerciseSession } from '@/stores/session'

export type ExerciseStatus = 'done' | 'in-progress' | 'todo'

/** "In progress" means an unsubmitted draft exists; it can coexist with earlier submissions. */
export function exerciseStatus(ex: ExerciseSummary, session?: ExerciseSession): ExerciseStatus {
  if (answeredCount(session) > 0) return 'in-progress'
  if (ex.attemptCount > 0) return 'done'
  return 'todo'
}

export function useExerciseStats(list: ExerciseSummary[] | undefined) {
  const sessions = useSessionStore((s) => s.sessions)
  return useMemo(() => {
    const statuses = (list ?? []).map((e) => exerciseStatus(e, sessions[e.id]))
    return {
      statuses,
      done: statuses.filter((s) => s === 'done').length,
      inProgress: statuses.filter((s) => s === 'in-progress').length,
    }
  }, [list, sessions])
}
