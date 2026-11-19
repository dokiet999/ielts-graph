import { useEffect, useRef, useState } from 'react'
import { useSessionStore } from '@/stores/session'

/**
 * Counts seconds spent on an exercise while the runner is open and persists them in the
 * session store. With a time limit it counts down and calls `onExpire` once at zero.
 */
export function useRunnerTimer(
  exerciseId: string,
  timeLimit: number | null,
  { running, onExpire }: { running: boolean; onExpire?: () => void },
) {
  const session = useSessionStore((s) => s.sessions[exerciseId])
  const startedAt = session?.startedAt
  const computeInitial = () => {
    const s = useSessionStore.getState().sessions[exerciseId]
    if (s?.startedAt) {
      return Math.max(0, Math.floor((Date.now() - s.startedAt) / 1000))
    }
    return s?.elapsed ?? 0
  }
  const [elapsed, setElapsed] = useState(computeInitial)
  const expired = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  useEffect(() => {
    if (startedAt) {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    }
  }, [startedAt])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const currentStartedAt = useSessionStore.getState().sessions[exerciseId]?.startedAt
      if (currentStartedAt) {
        setElapsed(Math.max(0, Math.floor((Date.now() - currentStartedAt) / 1000)))
      } else {
        setElapsed((e) => e + 1)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [exerciseId, running])

  useEffect(() => {
    if (running) useSessionStore.getState().setElapsed(exerciseId, elapsed)
  }, [exerciseId, elapsed, running])

  const remaining = timeLimit ? Math.max(0, timeLimit - elapsed) : null

  useEffect(() => {
    if (remaining === 0 && !expired.current) {
      expired.current = true
      onExpireRef.current?.()
    }
  }, [remaining])

  return { elapsed, remaining }
}
