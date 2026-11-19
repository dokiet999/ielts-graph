import { delay, http, HttpResponse } from 'msw'
import { gradeQuestion } from '@/lib/grading'
import type {
  BeCourse,
  BeCourseDetail,
  BeExercise,
  BeExerciseSummary,
  BeFinalTestSession,
  BeFinalTestStatus,
  BeLessonDetail,
  BeMyCourse,
  BeSpeakingResult,
  BeSubmissionDetail,
  BeSubmissionSummary,
  BeSubmitResult,
  BeWritingResult,
} from '@/lib/backend-types'
import {
  isSupportedAudioFilename,
  SPEAKING_MAX_DURATION_SEC,
  SPEAKING_MAX_FILE_BYTES,
  SPEAKING_MIN_DURATION_SEC,
} from '@/lib/speaking'
import type { AnswerValue, CheckAnswerResponse, Exercise, User } from '@/lib/types'
import {
  allQuestions,
  db,
  gradeExercise,
  persist,
  type StoredSubmission,
  type StoredUser,
} from './db'
import { courses, exercises, type CourseRecord } from './fixtures/courses'
import { KgRequestError, recommend } from './kg'
import {
  fakeSpeakingFeedback,
  SAMPLE_SPEAKING_FEATURES,
  SAMPLE_SPEAKING_PRONUNCIATION,
  SAMPLE_SPEAKING_TRANSCRIPT,
} from './speakingGrader'
import { fakeWritingFeedback } from './writingGrader'
import { countWords, WRITING_MIN_SUBMIT_WORDS } from '@/lib/writing'

// The mock mirrors the REAL backend contract (paths, JSON shapes, error format), so the same
// adapters run in mock and live mode. Auth endpoints and /exercises/{id}/check do not exist on
// the backend yet; they stay here so the login page and quiz mode keep working in mock mode.

const API = import.meta.env.VITE_API_URL ?? '/api'
const LATENCY = 250
/** Set this localStorage key to "1" to make the Knowledge Graph answer 503, as when Neo4j is down. */
export const MOCK_KG_DOWN_KEY = 'mock:kg-unavailable'

/** Backend BaseResponse envelope: { meta: { code }, data }. */
const ok = <T>(data: T, code = 200) => HttpResponse.json({ meta: { code }, data })

/** Backend error format: { code, message, details, timestamp }. */
const fail = (status: number, code: string, message: string, details?: unknown) =>
  HttpResponse.json(
    { code, message, details: details ?? null, timestamp: new Date().toISOString() },
    { status },
  )
const unauthorized = () => fail(401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.')

const publicUser = ({ password: _password, username: _username, ...u }: StoredUser): User => u
const tokenFor = (userId: string) => `mock-token.${userId}`

/** Accepts the mock bearer token (login page) and HTTP Basic (demo mode, like the real backend). */
function currentUser(request: Request): StoredUser | null {
  const auth = request.headers.get('Authorization') ?? ''
  if (auth.startsWith('Basic ')) {
    const username = atob(auth.slice(6)).split(':')[0].toLowerCase()
    return db.users.find((u) => u.username === username) ?? null
  }
  const userId = auth.replace('Bearer mock-token.', '')
  return db.users.find((u) => u.id === userId) ?? null
}

const userSubmissions = (userId: string) => db.submissions.filter((s) => s.userId === userId)
const doneIds = (userId: string) => new Set(userSubmissions(userId).map((s) => s.exerciseId))
// Writing and Speaking exercises have one prompt question and are scored as a band out of 9.
const WRITING_MAX_BAND = 9
const questionCount = (ex: Exercise) =>
  ex.skillType === 'WRITING' || ex.skillType === 'SPEAKING' ? 1 : allQuestions(ex).length
const maxScore = (ex: Exercise) =>
  ex.skillType === 'WRITING' || ex.skillType === 'SPEAKING'
    ? WRITING_MAX_BAND
    : allQuestions(ex).reduce((sum, q) => sum + q.points, 0)

const findCourseOf = (sectionId: string | null) =>
  courses.find((c) => c.sections.some((s) => s.id === sectionId))

/** Exercise in backend shape. `review` keeps correct options and explanations. */
function toBeExercise(ex: Exercise, review = false): BeExercise {
  return {
    id: ex.id,
    lessonId: ex.lessonId,
    sectionId: ex.sectionId,
    courseId: ex.courseId,
    title: ex.title,
    instruction: ex.instruction,
    audioUrl: ex.audioUrl,
    content: ex.content as BeExercise['content'],
    exerciseType: ex.exerciseType,
    skillType: ex.skillType,
    timeLimit: ex.timeLimit,
    maxAttempts: ex.maxAttempts,
    questionGroups: ex.questionGroups.map((g, gi) => ({
      id: g.id,
      groupTitle: g.groupTitle,
      groupInstruction: g.groupInstruction,
      questionType: g.questionType,
      questionRange: g.questionRange,
      imageUrl: g.imageUrl ?? null,
      ordering: gi + 1,
      questions: g.questions.map((q) => ({
        id: q.id,
        ordering: q.number,
        questionText: q.questionText,
        questionType: q.questionType,
        points: q.points,
        ...(review && { explanation: q.explanation ?? null }),
        options: q.options.map((o) => ({
          id: o.id,
          optionText: o.optionText,
          ordering: o.ordering,
          ...(review && { isCorrect: !!o.isCorrect }),
        })),
      })),
    })),
  }
}

function toBeExerciseSummary(ex: Exercise, userId: string): BeExerciseSummary {
  const subs = userSubmissions(userId).filter((s) => s.exerciseId === ex.id)
  const lessonTitle = courses
    .flatMap((c) => c.sections.flatMap((s) => s.lessons))
    .find((l) => l.id === ex.lessonId)?.title
  const last = [...subs].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
  return {
    id: ex.id,
    title: ex.title,
    exerciseType: ex.exerciseType,
    skillType: ex.skillType,
    timeLimit: ex.timeLimit,
    ordering: 1,
    lessonId: ex.lessonId,
    lessonTitle: lessonTitle ?? null,
    sectionId: ex.sectionId,
    courseId: ex.courseId,
    questionCount: questionCount(ex),
    maxScore: maxScore(ex),
    attemptCount: subs.length,
    bestScore: subs.length ? Math.max(...subs.map((s) => s.score)) : null,
    lastSubmissionId: last?.id ?? null,
  }
}

function toBeCourse(c: CourseRecord): BeCourse {
  return {
    id: c.id,
    teacherId: c.teacher.id,
    teacherName: c.teacher.fullName,
    categoryName: c.categoryName,
    title: c.title,
    description: c.description,
    thumbnail: null,
    skillFocus: 'READING',
    difficultyLevel: c.level,
    estimatedDuration: c.estimatedDuration,
  }
}

const countDone = (exs: Exercise[], done: Set<string>) => exs.filter((e) => done.has(e.id)).length
const isPracticeExercise = (e: Exercise) =>
  e.exerciseType !== 'MOCK_TEST' && e.exerciseType !== 'FINAL_TEST'

interface MockFinalTestGrant {
  sectionId: string
  userId: string
  unlocked: boolean
  deadlineDays: number
  grantedAt: string
  expiresAt: string
}

interface MockFinalTestSession {
  id: string
  exerciseId: string
  userId: string
  startedAt: string
  expiresAt: string
  timeLimitSeconds: number
}

const defaultGrantExpiry = () => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
const finalTestGrants = new Map<string, MockFinalTestGrant>([
  [
    's-f1',
    {
      sectionId: 's-f1',
      userId: 'u-1',
      unlocked: true,
      deadlineDays: 7,
      grantedAt: new Date().toISOString(),
      expiresAt: defaultGrantExpiry(),
    },
  ],
  [
    's-i1',
    {
      sectionId: 's-i1',
      userId: 'u-1',
      unlocked: true,
      deadlineDays: 7,
      grantedAt: new Date().toISOString(),
      expiresAt: defaultGrantExpiry(),
    },
  ],
])
const finalTestSessions = new Map<string, MockFinalTestSession>()

function buildBeFinalTestStatus(sectionId: string, userId: string): BeFinalTestStatus | null {
  const course = findCourseOf(sectionId)
  if (!course) return null
  const finalEx = exercises.find(
    (e) => e.sectionId === sectionId && e.exerciseType === 'FINAL_TEST',
  )
  const grant = finalTestGrants.get(sectionId)
  const nowMs = Date.now()
  const grantExpired = grant ? new Date(grant.expiresAt).getTime() <= nowMs : false
  const unlocked = Boolean(grant && grant.unlocked && !grantExpired)
  const rawSession = finalEx ? finalTestSessions.get(`${userId}:${finalEx.id}`) : undefined
  let activeSession: BeFinalTestSession | null = null
  if (rawSession) {
    const remaining = Math.max(
      0,
      Math.floor((new Date(rawSession.expiresAt).getTime() - nowMs) / 1000),
    )
    activeSession = {
      sessionId: rawSession.id,
      exerciseId: rawSession.exerciseId,
      startedAt: rawSession.startedAt,
      expiresAt: rawSession.expiresAt,
      remainingSeconds: remaining,
    }
  }
  return {
    exercise: finalEx ? toBeExerciseSummary(finalEx, userId) : null,
    unlocked,
    grantExpired,
    deadlineDays: grant?.deadlineDays ?? null,
    unlockedAt: grant?.grantedAt ?? null,
    grantExpiresAt: grant?.expiresAt ?? null,
    activeSession,
  }
}

function toBeMyCourse(c: CourseRecord, userId: string): BeMyCourse {
  const exs = exercises.filter((e) => e.courseId === c.id && isPracticeExercise(e))
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail: null,
    difficultyLevel: c.level,
    skillFocus: 'READING',
    categoryName: c.categoryName,
    teacherId: c.teacher.id,
    teacherName: c.teacher.fullName,
    estimatedDuration: c.estimatedDuration,
    enrolledAt: c.enrolledAt,
    completedAt: c.completedAt,
    sectionCount: c.sections.length,
    exerciseCount: exs.length,
    completedExerciseCount: countDone(exs, doneIds(userId)),
  }
}

function toBeCourseDetail(c: CourseRecord, userId: string): BeCourseDetail {
  const done = doneIds(userId)
  const exs = exercises.filter((e) => e.courseId === c.id && isPracticeExercise(e))
  return {
    course: toBeCourse(c),
    totalLessons: c.sections.reduce((n, s) => n + s.lessons.length, 0),
    exerciseCount: exs.length,
    completedExerciseCount: countDone(exs, done),
    enrollment: { enrolledAt: c.enrolledAt, completedAt: c.completedAt },
    sections: c.sections.map((s, i) => {
      const sectionExercises = exercises.filter(
        (e) => e.sectionId === s.id && isPracticeExercise(e),
      )
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        ordering: i + 1,
        exerciseCount: sectionExercises.length,
        completedExerciseCount: countDone(sectionExercises, done),
        lessons: s.lessons.map((l) => ({
          id: l.id,
          sectionId: l.sectionId,
          title: l.title,
          lessonType: l.lessonType,
          videoDuration: l.videoDuration ?? null,
          ordering: l.ordering,
          isPreview: false,
          exerciseCount: exercises.filter((e) => e.lessonId === l.id && isPracticeExercise(e))
            .length,
        })),
      }
    }),
  }
}

function toBeSubmission(s: StoredSubmission): BeSubmissionSummary {
  const ex = exercises.find((e) => e.id === s.exerciseId)!
  return {
    id: s.id,
    exerciseId: s.exerciseId,
    exerciseTitle: ex.title,
    skillType: ex.skillType,
    exerciseType: ex.exerciseType,
    courseId: ex.courseId,
    sectionId: ex.sectionId,
    attemptNumber: s.attemptNumber,
    status: 'GRADED',
    score: s.score,
    maxScore: s.maxScore,
    correctCount: s.correctCount,
    questionCount: s.questionCount,
    timeSpent: s.timeSpent,
    submittedAt: s.submittedAt,
  }
}

function toBeSubmissionDetail(s: StoredSubmission): BeSubmissionDetail {
  const ex = exercises.find((e) => e.id === s.exerciseId)!
  return {
    ...toBeSubmission(s),
    answers: s.answers,
    results: s.results,
    exercise: toBeExercise(ex, true),
    aiStructuredFeedback: (s.aiStructuredFeedback ??
      null) as BeSubmissionDetail['aiStructuredFeedback'],
  }
}

export const handlers = [
  // ---------------------------------------------------------------- auth (mock only)
  http.post(`${API}/auth/login`, async ({ request }) => {
    await delay(LATENCY)
    const { email, password } = (await request.json()) as { email: string; password: string }
    const user = db.users.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() ||
        u.username === email.trim().toLowerCase(),
    )
    if (!user || user.password !== password) {
      return fail(401, 'UNAUTHORIZED', 'Email hoặc mật khẩu không đúng.')
    }
    return ok({ accessToken: tokenFor(user.id), user: publicUser(user) })
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as { fullName: string; email: string; password: string }
    if (db.users.some((u) => u.email.toLowerCase() === body.email.trim().toLowerCase())) {
      return fail(409, 'CONFLICT', 'Email này đã được đăng ký.')
    }
    const user: StoredUser = {
      id: `u-${crypto.randomUUID()}`,
      username: body.email.trim().toLowerCase(),
      email: body.email.trim(),
      fullName: body.fullName.trim(),
      password: body.password,
      avatarUrl: null,
      bio: null,
      phone: null,
      role: 'STUDENT',
    }
    db.users.push(user)
    persist()
    return ok({ accessToken: tokenFor(user.id), user: publicUser(user) })
  }),

  http.get(`${API}/users/me`, ({ request }) => {
    const user = currentUser(request)
    return user ? ok(publicUser(user)) : unauthorized()
  }),

  http.put(`${API}/users/me`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const body = (await request.json()) as Partial<User>
    Object.assign(user, {
      fullName: body.fullName ?? user.fullName,
      phone: body.phone ?? null,
      bio: body.bio ?? null,
      avatarUrl: body.avatarUrl || null,
    })
    persist()
    return ok(publicUser(user))
  }),

  // ---------------------------------------------------------------- courses & lessons
  http.get(`${API}/courses/my`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    return ok(courses.map((c) => toBeMyCourse(c, user.id)))
  }),

  http.get(`${API}/courses/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const course = courses.find((c) => c.id === params.id)
    return course
      ? ok(toBeCourseDetail(course, user.id))
      : fail(404, 'NOT_FOUND', 'Course not found')
  }),

  http.get(`${API}/lessons/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const course = courses.find((c) =>
      c.sections.some((s) => s.lessons.some((l) => l.id === params.id)),
    )
    const section = course?.sections.find((s) => s.lessons.some((l) => l.id === params.id))
    const lesson = section?.lessons.find((l) => l.id === params.id)
    if (!course || !section || !lesson) return fail(404, 'NOT_FOUND', 'Lesson not found')
    const body: BeLessonDetail = {
      lesson: {
        id: lesson.id,
        sectionId: lesson.sectionId,
        title: lesson.title,
        lessonType: lesson.lessonType,
        videoUrl: lesson.videoUrl ?? null,
        videoDuration: lesson.videoDuration ?? null,
        documentUrl: lesson.documentUrl ?? null,
        ordering: lesson.ordering,
        isPreview: false,
      },
      courseId: course.id,
      courseTitle: course.title,
      sectionId: section.id,
      sectionTitle: section.title,
      exercises: exercises
        .filter((e) => e.lessonId === lesson.id && isPracticeExercise(e))
        .map((e) => toBeExerciseSummary(e, user.id)),
    }
    return ok(body)
  }),

  http.get(`${API}/sections/:id/exercises`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const sectionId = params.id as string
    if (!findCourseOf(sectionId)) return fail(404, 'NOT_FOUND', 'Section not found')
    return ok(
      exercises
        .filter((e) => e.sectionId === sectionId && isPracticeExercise(e))
        .map((e) => toBeExerciseSummary(e, user.id)),
    )
  }),

  http.get(`${API}/sections/:id/mock-tests`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const sectionId = params.id as string
    const course = findCourseOf(sectionId)
    if (!course) return fail(404, 'NOT_FOUND', 'Section not found')
    const direct = exercises.filter(
      (e) => e.sectionId === sectionId && e.exerciseType === 'MOCK_TEST',
    )
    const list =
      direct.length > 0
        ? direct
        : exercises.filter((e) => e.courseId === course.id && e.exerciseType === 'MOCK_TEST')
    return ok(list.map((e) => toBeExerciseSummary(e, user.id)))
  }),

  http.get(`${API}/sections/:id/final-test`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const status = buildBeFinalTestStatus(params.id as string, user.id)
    return status ? ok(status) : fail(404, 'NOT_FOUND', 'Section not found')
  }),

  http.post(`${API}/sections/:id/final-test/unlock`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const sectionId = params.id as string
    if (!findCourseOf(sectionId)) return fail(404, 'NOT_FOUND', 'Section not found')
    const body = (await request.json().catch(() => ({}))) as { deadlineDays?: number }
    const days = body.deadlineDays && body.deadlineDays > 0 ? body.deadlineDays : 7
    const now = new Date()
    finalTestGrants.set(sectionId, {
      sectionId,
      userId: user.id,
      unlocked: true,
      deadlineDays: days,
      grantedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString(),
    })
    return ok(buildBeFinalTestStatus(sectionId, user.id))
  }),

  http.post(`${API}/sections/:id/final-test/lock`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const sectionId = params.id as string
    if (!findCourseOf(sectionId)) return fail(404, 'NOT_FOUND', 'Section not found')
    const existing = finalTestGrants.get(sectionId)
    if (existing) {
      existing.unlocked = false
    }
    return ok(buildBeFinalTestStatus(sectionId, user.id))
  }),

  http.post(`${API}/sections/:id/final-test/start`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const sectionId = params.id as string
    const status = buildBeFinalTestStatus(sectionId, user.id)
    if (!status) return fail(404, 'NOT_FOUND', 'Section not found')
    if (!status.unlocked || !status.exercise) {
      return fail(409, 'FINAL_TEST_LOCKED', 'Bài kiểm tra cuối khóa chưa được mở khóa hoặc đã hết hạn.')
    }
    if (status.activeSession && status.activeSession.remainingSeconds > 0) {
      return ok(status.activeSession)
    }
    const timeLimit = status.exercise.timeLimit && status.exercise.timeLimit > 0 ? status.exercise.timeLimit : 1200
    const startedAt = new Date()
    const expiresAt = new Date(startedAt.getTime() + timeLimit * 1000)
    const session: MockFinalTestSession = {
      id: `fts-${crypto.randomUUID()}`,
      exerciseId: status.exercise.id,
      userId: user.id,
      startedAt: startedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      timeLimitSeconds: timeLimit,
    }
    finalTestSessions.set(`${user.id}:${status.exercise.id}`, session)
    const dto: BeFinalTestSession = {
      sessionId: session.id,
      exerciseId: session.exerciseId,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      remainingSeconds: timeLimit,
    }
    return ok(dto)
  }),

  // ---------------------------------------------------------------- exercises & submissions
  http.get(`${API}/exercises/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    if (!currentUser(request)) return unauthorized()
    const ex = exercises.find((e) => e.id === params.id)
    return ex ? ok(toBeExercise(ex)) : fail(404, 'NOT_FOUND', 'Exercise not found')
  }),

  // Not on the backend yet (quiz mode). Kept so the quiz keeps working in mock mode.
  http.post(`${API}/exercises/:id/check`, async ({ request, params }) => {
    await delay(150)
    if (!currentUser(request)) return unauthorized()
    const ex = exercises.find((e) => e.id === params.id)
    if (!ex) return fail(404, 'NOT_FOUND', 'Exercise not found')
    const { questionId, answer } = (await request.json()) as {
      questionId: string
      answer: AnswerValue
    }
    const question = allQuestions(ex).find((x) => x.id === questionId)
    if (!question) return fail(404, 'NOT_FOUND', 'Question not found')
    const correctOptions = question.options.filter((o) => o.isCorrect)
    const body: CheckAnswerResponse = {
      correct: gradeQuestion(question, answer),
      correctOptionIds: correctOptions.map((o) => o.id),
      acceptedAnswers: correctOptions.map((o) => o.optionText),
      explanation: question.explanation ?? null,
    }
    return ok(body)
  }),

  http.post(`${API}/exercises/:id/submit`, async ({ request, params }) => {
    await delay(500)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const ex = exercises.find((e) => e.id === params.id)
    if (!ex) return fail(404, 'NOT_FOUND', 'Exercise not found')
    const body = (await request.json()) as {
      answers: Record<string, unknown>
      timeSpent?: number
    }
    if (!body.answers || typeof body.answers !== 'object') {
      return fail(400, 'BAD_REQUEST', 'answers must not be null')
    }
    // Same rule as the backend: every answer is a single string (option id or typed text).
    const invalid = Object.fromEntries(
      Object.entries(body.answers)
        .filter(([, value]) => typeof value !== 'string' && typeof value !== 'number')
        .map(([id]) => [id, 'id of an option of this question expected']),
    )
    if (Object.keys(invalid).length) {
      return fail(400, 'INVALID_ANSWER', 'Some answers are not valid', invalid)
    }
    if (typeof body.timeSpent === 'number' && (body.timeSpent < 0 || body.timeSpent > 86400)) {
      return fail(400, 'BAD_REQUEST', 'timeSpent out of range')
    }
    const previous = userSubmissions(user.id).filter((s) => s.exerciseId === ex.id).length
    if (previous >= ex.maxAttempts) {
      return fail(
        409,
        'MAX_ATTEMPTS_REACHED',
        `Maximum attempts (${ex.maxAttempts}) reached for this exercise`,
      )
    }
    const answers = body.answers as Record<string, string>
    const graded = gradeExercise(ex, answers)
    const stored: StoredSubmission = {
      id: `sub-${crypto.randomUUID()}`,
      userId: user.id,
      exerciseId: ex.id,
      attemptNumber: previous + 1,
      answers,
      ...graded,
      timeSpent: Math.round(body.timeSpent ?? 0),
      submittedAt: new Date().toISOString(),
    }
    db.submissions.push(stored)
    finalTestSessions.delete(`${user.id}:${ex.id}`)
    persist()
    const result: BeSubmitResult = { result: { submissionId: stored.id } }
    return ok(result)
  }),

  // Writing: same contract as POST /exercises/{id}/submit/writing of the backend. Put `[503]` in the
  // essay to make the AI fail, to see how the page handles an unavailable service.
  http.post(`${API}/exercises/:id/submit/writing`, async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const ex = exercises.find((e) => e.id === params.id)
    if (!ex) return fail(404, 'NOT_FOUND', 'Exercise not found')
    if (ex.skillType !== 'WRITING') {
      return fail(400, 'INVALID_EXERCISE', 'This exercise is not a Writing exercise')
    }
    const body = (await request.json()) as { essayText?: string; timeSpent?: number }
    const essay = body.essayText ?? ''
    if (essay.trim() === '') return fail(400, 'BAD_REQUEST', 'essayText must not be blank')
    if (countWords(essay) < WRITING_MIN_SUBMIT_WORDS) {
      return fail(
        400,
        'ESSAY_TOO_SHORT',
        `Essay must have at least ${WRITING_MIN_SUBMIT_WORDS} words`,
      )
    }
    const previous = userSubmissions(user.id).filter((s) => s.exerciseId === ex.id).length
    if (previous >= ex.maxAttempts) {
      return fail(
        409,
        'MAX_ATTEMPTS_REACHED',
        `Maximum attempts (${ex.maxAttempts}) reached for this exercise`,
      )
    }
    await delay(1500) // the real AI call takes seconds
    if (essay.includes('[503]')) {
      return fail(
        503,
        'LLM_UNAVAILABLE',
        'The AI service is temporarily unavailable. Please try again later',
      )
    }
    const feedback = fakeWritingFeedback(essay, 'QT_W2_DISCUSSION')
    const band = Number(feedback.overall_band)
    const stored: StoredSubmission = {
      id: `sub-${crypto.randomUUID()}`,
      userId: user.id,
      exerciseId: ex.id,
      attemptNumber: previous + 1,
      answers: { essayText: essay },
      results: [],
      aiStructuredFeedback: feedback as unknown as Record<string, unknown>,
      score: band,
      maxScore: WRITING_MAX_BAND,
      correctCount: 0,
      questionCount: 1,
      timeSpent: Math.round(body.timeSpent ?? 0),
      submittedAt: new Date().toISOString(),
    }
    db.submissions.push(stored)
    finalTestSessions.delete(`${user.id}:${ex.id}`)
    persist()
    const result: BeWritingResult = {
      submissionId: stored.id,
      exerciseId: ex.id,
      exerciseTitle: ex.title,
      attemptNumber: stored.attemptNumber,
      overallBand: band,
      outOfCalibrationRange: false,
      status: 'GRADED',
      timeSpent: stored.timeSpent,
      submittedAt: stored.submittedAt,
      taskType: 'QT_W2_DISCUSSION',
      summary: feedback.summary ?? null,
      improvements: feedback.improvements ?? null,
      aiModel: 'mock',
      aiPromptVersion: 'writing-v1.0',
      aiLatencyMs: 1500,
      rawFeedback: feedback,
    }
    return ok(result)
  }),

  // Speaking: same contract as POST /exercises/{id}/submit/speaking of the backend.
  http.post(`${API}/exercises/:id/submit/speaking`, async ({ request, params }) => {
    const user = currentUser(request)
    if (!user) return unauthorized()
    const ex = exercises.find((e) => e.id === params.id)
    if (!ex) return fail(404, 'NOT_FOUND', 'Exercise not found')
    if (ex.skillType !== 'SPEAKING') {
      return fail(400, 'INVALID_EXERCISE', 'This exercise is not a Speaking exercise')
    }
    const formData = await request.formData()
    const audio = formData.get('audio')
    const partParam = formData.get('part')
    const durationParam = formData.get('timeSpent')
    if (!(audio instanceof Blob) || audio.size === 0) {
      return fail(400, 'AUDIO_TOO_SHORT', 'Audio file must not be empty')
    }
    const filename = audio instanceof File ? audio.name : 'recording.webm'
    if (!isSupportedAudioFilename(filename)) {
      return fail(400, 'UNSUPPORTED_AUDIO', 'Unsupported audio format')
    }
    if (audio.size > SPEAKING_MAX_FILE_BYTES) {
      return fail(413, 'AUDIO_TOO_LARGE', 'Audio file is too large')
    }
    const durationSec = durationParam ? Number(durationParam) : 38
    if (durationSec > 0 && durationSec < SPEAKING_MIN_DURATION_SEC) {
      return fail(400, 'AUDIO_TOO_SHORT', 'Audio recording is too short')
    }
    // The ASR service rejects longer audio. The real backend still reports it as ASR_BAD_RESPONSE
    // (W5_issue.md #1); the mock already sends the code the UI expects once that is fixed.
    if (durationSec > SPEAKING_MAX_DURATION_SEC) {
      return fail(413, 'AUDIO_TOO_LONG', 'Audio is too long')
    }
    const previous = userSubmissions(user.id).filter((s) => s.exerciseId === ex.id).length
    if (previous >= ex.maxAttempts) {
      return fail(
        409,
        'MAX_ATTEMPTS_REACHED',
        `Maximum attempts (${ex.maxAttempts}) reached for this exercise`,
      )
    }
    await delay(1200)
    const part = typeof partParam === 'string' && partParam ? partParam : 'QT_S_PART2'
    const feedback = fakeSpeakingFeedback(part)
    const band = Number(feedback.overall_band)
    const stored: StoredSubmission = {
      id: `sub-${crypto.randomUUID()}`,
      userId: user.id,
      exerciseId: ex.id,
      attemptNumber: previous + 1,
      answers: {
        transcript: SAMPLE_SPEAKING_TRANSCRIPT,
        part,
      },
      results: [],
      aiStructuredFeedback: feedback as unknown as Record<string, unknown>,
      score: band,
      maxScore: WRITING_MAX_BAND,
      correctCount: 0,
      questionCount: 1,
      timeSpent: Math.round(durationSec),
      submittedAt: new Date().toISOString(),
    }
    db.submissions.push(stored)
    finalTestSessions.delete(`${user.id}:${ex.id}`)
    persist()
    const result: BeSpeakingResult = {
      submissionId: stored.id,
      exerciseId: ex.id,
      exerciseTitle: ex.title,
      attemptNumber: stored.attemptNumber,
      part,
      overallBand: band,
      outOfCalibrationRange: false,
      status: 'GRADED',
      timeSpent: stored.timeSpent,
      submittedAt: stored.submittedAt,
      transcript: SAMPLE_SPEAKING_TRANSCRIPT,
      features: SAMPLE_SPEAKING_FEATURES,
      pronunciation: SAMPLE_SPEAKING_PRONUNCIATION,
      summary: feedback.summary ?? null,
      improvements: feedback.improvements ?? null,
      asrModel: 'whisper-small',
      aiModel: 'mock',
      aiPromptVersion: 'speaking-v1.0',
      aiLatencyMs: 1200,
      rawFeedback: feedback,
    }
    return ok(result)
  }),

  // Knowledge Graph: same contract as GET /api/kg/recommendations (docs/kg-api-contract.md).
  http.get(`${API}/kg/recommendations`, async ({ request }) => {
    await delay(LATENCY)
    if (!currentUser(request)) return unauthorized()
    if (localStorage.getItem(MOCK_KG_DOWN_KEY) === '1') {
      return fail(
        503,
        'KG_UNAVAILABLE',
        'The knowledge graph is temporarily unavailable. Please try again later',
      )
    }
    try {
      return ok(recommend(new URL(request.url).searchParams))
    } catch (e) {
      if (e instanceof KgRequestError) return fail(400, e.code, e.message, e.details)
      throw e
    }
  }),

  http.get(`${API}/submissions/me`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    return ok(
      userSubmissions(user.id)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map(toBeSubmission),
    )
  }),

  http.get(`${API}/submissions/:id/detail`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const s = db.submissions.find((x) => x.id === params.id)
    if (!s) return fail(404, 'NOT_FOUND', 'Submission not found')
    if (s.userId !== user.id) return fail(403, 'FORBIDDEN', 'Access denied to this submission')
    return ok(toBeSubmissionDetail(s))
  }),
]
