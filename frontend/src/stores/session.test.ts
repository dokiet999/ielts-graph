import { beforeEach, describe, expect, it } from 'vitest'
import { answeredCount, isAnswered, useSessionStore } from './session'

describe('session store', () => {
  beforeEach(() => useSessionStore.setState({ sessions: {} }))

  it('creates a session and records answers, flags and time', () => {
    const s = useSessionStore.getState()
    s.ensure('ex1', { title: 'Reading 1', questionCount: 3 })
    s.setAnswer('ex1', 'q1', ['o2'])
    s.setAnswer('ex1', 'q2', 'sponge')
    s.setAnswer('ex1', 'q3', '   ')
    s.toggleFlag('ex1', 'q2')
    s.setElapsed('ex1', 42)

    const session = useSessionStore.getState().sessions.ex1
    expect(session.title).toBe('Reading 1')
    expect(answeredCount(session)).toBe(2)
    expect(session.flags).toEqual(['q2'])
    expect(session.elapsed).toBe(42)

    s.toggleFlag('ex1', 'q2')
    expect(useSessionStore.getState().sessions.ex1.flags).toEqual([])
  })

  it('keeps existing progress when the runner opens the exercise again', () => {
    const s = useSessionStore.getState()
    s.ensure('ex1', { title: 'Old title', questionCount: 3 })
    s.setAnswer('ex1', 'q1', ['o1'])
    s.ensure('ex1', { title: 'New title', questionCount: 3 })
    const session = useSessionStore.getState().sessions.ex1
    expect(session.answers).toEqual({ q1: ['o1'] })
    expect(session.title).toBe('New title')
  })

  it('persists to localStorage so a reload restores the attempt', () => {
    useSessionStore.getState().setAnswer('ex2', 'q1', 'compost')
    const stored = JSON.parse(localStorage.getItem('ielts-sessions')!)
    expect(stored.state.sessions.ex2.answers).toEqual({ q1: 'compost' })
  })

  it('clears a session after submitting', () => {
    useSessionStore.getState().setAnswer('ex3', 'q1', 'x')
    useSessionStore.getState().clear('ex3')
    expect(useSessionStore.getState().sessions.ex3).toBeUndefined()
  })

  it('treats empty strings and empty selections as unanswered', () => {
    expect(isAnswered(undefined)).toBe(false)
    expect(isAnswered([])).toBe(false)
    expect(isAnswered('  ')).toBe(false)
    expect(isAnswered(['o1'])).toBe(true)
  })
})
