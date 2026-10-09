import { gradeQuestion } from '@/lib/grading'
import type { Answers, Exercise, QuestionResult, User } from '@/lib/types'
import { DEMO_PASSWORD, exercises, seedAttempts, seedUsers } from './fixtures/courses'

// In-browser stand-in for the backend database. Persisted to localStorage so registrations,
// profile edits and submissions survive reloads. Bump VERSION when the shape changes.
const KEY = 'ielts-mock-db'
const VERSION = 1

export interface StoredUser extends User {
  password: string
}

export interface StoredSubmission {
  id: string
  userId: string
  exerciseId: string
  attemptNumber: number
  answers: Answers
  results: QuestionResult[]
  score: number
  maxScore: number
  correctCount: number
  questionCount: number
  timeSpent: number
  submittedAt: string
}

interface DbState {
  version: number
  users: StoredUser[]
  submissions: StoredSubmission[]
}

export const allQuestions = (ex: Exercise) => ex.questionGroups.flatMap((g) => g.questions)

export function gradeExercise(ex: Exercise, answers: Answers) {
  const results: QuestionResult[] = allQuestions(ex).map((q) => {
    const correct = gradeQuestion(q, answers[q.id])
    return { questionId: q.id, correct, earned: correct ? q.points : 0 }
  })
  return {
    results,
    score: results.reduce((s, r) => s + r.earned, 0),
    maxScore: allQuestions(ex).reduce((s, q) => s + q.points, 0),
    correctCount: results.filter((r) => r.correct).length,
    questionCount: results.length,
  }
}

/** Builds answers that get exactly `correct` questions right (used for seed data). */
function answersWithScore(ex: Exercise, correct: number): Answers {
  const answers: Answers = {}
  allQuestions(ex).forEach((q, i) => {
    const right = q.options.filter((o) => o.isCorrect)
    const wrong = q.options.find((o) => !o.isCorrect)
    if (q.questionType === 'FILL_BLANK') {
      answers[q.id] = i < correct ? right[0].optionText : 'unknown'
    } else if (i < correct) {
      answers[q.id] = right.map((o) => o.id)
    } else if (wrong) {
      answers[q.id] = [wrong.id]
    }
  })
  return answers
}

function seed(): DbState {
  const now = Date.now()
  const submissions: StoredSubmission[] = []
  for (const [exerciseId, correct, minutesAgo] of seedAttempts) {
    const ex = exercises.find((e) => e.id === exerciseId)
    if (!ex) continue
    const answers = answersWithScore(ex, correct)
    submissions.push({
      id: `sub-seed-${submissions.length + 1}`,
      userId: 'u-demo',
      exerciseId,
      attemptNumber: submissions.filter((s) => s.exerciseId === exerciseId).length + 1,
      answers,
      ...gradeExercise(ex, answers),
      timeSpent: (ex.timeLimit ?? 300) * 0.7,
      submittedAt: new Date(now - minutesAgo * 60_000).toISOString(),
    })
  }
  return {
    version: VERSION,
    users: seedUsers.map((u) => ({ ...u, password: DEMO_PASSWORD })),
    submissions,
  }
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.version === VERSION) return parsed
    }
  } catch {
    // Corrupt or unavailable storage: start from seed data.
  }
  return seed()
}

export const db: DbState = load()

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // Storage may be unavailable (private mode); the mock still works in memory.
  }
}

export function resetDb() {
  const fresh = seed()
  db.users = fresh.users
  db.submissions = fresh.submissions
  persist()
}
