import { delay, http, HttpResponse } from 'msw'
import { gradeQuestion } from '@/lib/grading'
import type {
  BeCourse,
  BeCourseDetail,
  BeExercise,
  BeExerciseSummary,
  BeLessonDetail,
  BeMyCourse,
  BeSubmissionDetail,
  BeSubmissionSummary,
  BeSubmitResult,
} from '@/lib/backend-types'
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

// The mock mirrors the REAL backend contract (paths, JSON shapes, error format), so the same
// adapters run in mock and live mode. Auth endpoints and /exercises/{id}/check do not exist on
// the backend yet; they stay here so the login page and quiz mode keep working in mock mode.

const API = import.meta.env.VITE_API_URL ?? '/api'
const LATENCY = 250

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
const questionCount = (ex: Exercise) => allQuestions(ex).length
const maxScore = (ex: Exercise) => allQuestions(ex).reduce((sum, q) => sum + q.points, 0)

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

function toBeMyCourse(c: CourseRecord, userId: string): BeMyCourse {
  const exs = exercises.filter((e) => e.courseId === c.id)
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
  const exs = exercises.filter((e) => e.courseId === c.id)
  return {
    course: toBeCourse(c),
    totalLessons: c.sections.reduce((n, s) => n + s.lessons.length, 0),
    exerciseCount: exs.length,
    completedExerciseCount: countDone(exs, done),
    enrollment: { enrolledAt: c.enrolledAt, completedAt: c.completedAt },
    sections: c.sections.map((s, i) => {
      const sectionExercises = exercises.filter((e) => e.sectionId === s.id)
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
          exerciseCount: exercises.filter((e) => e.lessonId === l.id).length,
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
    return HttpResponse.json({ accessToken: tokenFor(user.id), user: publicUser(user) })
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
    return HttpResponse.json({ accessToken: tokenFor(user.id), user: publicUser(user) })
  }),

  http.get(`${API}/users/me`, ({ request }) => {
    const user = currentUser(request)
    return user ? HttpResponse.json(publicUser(user)) : unauthorized()
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
    return HttpResponse.json(publicUser(user))
  }),

  // ---------------------------------------------------------------- courses & lessons
  http.get(`${API}/courses/my`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    return HttpResponse.json(courses.map((c) => toBeMyCourse(c, user.id)))
  }),

  http.get(`${API}/courses/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const course = courses.find((c) => c.id === params.id)
    return course
      ? HttpResponse.json(toBeCourseDetail(course, user.id))
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
        .filter((e) => e.lessonId === lesson.id)
        .map((e) => toBeExerciseSummary(e, user.id)),
    }
    return HttpResponse.json(body)
  }),

  http.get(`${API}/sections/:id/exercises`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const sectionId = params.id as string
    if (!findCourseOf(sectionId)) return fail(404, 'NOT_FOUND', 'Section not found')
    return HttpResponse.json(
      exercises
        .filter((e) => e.sectionId === sectionId)
        .map((e) => toBeExerciseSummary(e, user.id)),
    )
  }),

  // ---------------------------------------------------------------- exercises & submissions
  http.get(`${API}/exercises/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    if (!currentUser(request)) return unauthorized()
    const ex = exercises.find((e) => e.id === params.id)
    return ex ? HttpResponse.json(toBeExercise(ex)) : fail(404, 'NOT_FOUND', 'Exercise not found')
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
    return HttpResponse.json(body)
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
    persist()
    const result: BeSubmitResult = { result: { submissionId: stored.id } }
    return HttpResponse.json(result)
  }),

  http.get(`${API}/submissions/me`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    return HttpResponse.json(
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
    return HttpResponse.json(toBeSubmissionDetail(s))
  }),
]
