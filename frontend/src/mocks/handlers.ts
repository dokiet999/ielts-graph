import { delay, http, HttpResponse } from 'msw'
import { estimateBand } from '@/lib/band'
import { gradeQuestion } from '@/lib/grading'
import type {
  AnswerValue,
  Answers,
  CheckAnswerResponse,
  CourseDetail,
  CourseSummary,
  DashboardStats,
  Exercise,
  ExerciseSummary,
  Lesson,
  SkillType,
  Submission,
  SubmissionDetail,
  User,
} from '@/lib/types'
import { allQuestions, db, gradeExercise, persist, type StoredSubmission } from './db'
import { courses, exercises, type CourseRecord } from './fixtures/courses'

const API = import.meta.env.VITE_API_URL ?? '/api'
const LATENCY = 250

const fail = (status: number, message: string) => HttpResponse.json({ message }, { status })

const publicUser = ({ password: _password, ...u }: (typeof db.users)[number]): User => u
const tokenFor = (userId: string) => `mock-token.${userId}`

function currentUser(request: Request) {
  const auth = request.headers.get('Authorization') ?? ''
  const userId = auth.replace('Bearer mock-token.', '')
  return db.users.find((u) => u.id === userId) ?? null
}

/** Removes answers and explanations so the learner cannot read them while doing the exercise. */
function forLearner(ex: Exercise): Exercise {
  return {
    ...ex,
    questionGroups: ex.questionGroups.map((g) => ({
      ...g,
      questions: g.questions.map(({ explanation: _e, ...q }) => ({
        ...q,
        options: q.options.map(({ isCorrect: _c, ...o }) => o),
      })),
    })),
  }
}

const userSubmissions = (userId: string) => db.submissions.filter((s) => s.userId === userId)

function summary(ex: Exercise, userId: string): ExerciseSummary {
  const subs = userSubmissions(userId).filter((s) => s.exerciseId === ex.id)
  const lessonTitle = courses
    .flatMap((c) => c.sections.flatMap((s) => s.lessons))
    .find((l) => l.id === ex.lessonId)?.title
  const last = [...subs].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
  return {
    id: ex.id,
    lessonId: ex.lessonId,
    lessonTitle: lessonTitle ?? null,
    sectionId: ex.sectionId,
    title: ex.title,
    exerciseType: ex.exerciseType,
    skillType: ex.skillType,
    timeLimit: ex.timeLimit,
    questionCount: allQuestions(ex).length,
    attemptCount: subs.length,
    bestScore: subs.length ? Math.max(...subs.map((s) => s.score)) : null,
    maxScore: allQuestions(ex).reduce((sum, q) => sum + q.points, 0),
    lastSubmissionId: last?.id ?? null,
  }
}

const doneIds = (userId: string) => new Set(userSubmissions(userId).map((s) => s.exerciseId))

function courseSummary(c: CourseRecord, userId: string): CourseSummary {
  const exs = exercises.filter((e) => e.courseId === c.id)
  const done = doneIds(userId)
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail: null,
    level: c.level,
    categoryName: c.categoryName,
    teacher: c.teacher,
    estimatedDuration: c.estimatedDuration,
    enrollmentStatus: c.enrollmentStatus,
    enrolledAt: c.enrolledAt,
    completedAt: c.completedAt,
    sectionCount: c.sections.length,
    exerciseCount: exs.length,
    completedExerciseCount: exs.filter((e) => done.has(e.id)).length,
  }
}

function courseDetail(c: CourseRecord, userId: string): CourseDetail {
  const done = doneIds(userId)
  return {
    ...courseSummary(c, userId),
    sections: c.sections.map((s, i) => {
      const exs = exercises.filter((e) => e.sectionId === s.id)
      return {
        id: s.id,
        courseId: c.id,
        title: s.title,
        description: s.description,
        ordering: i + 1,
        lessons: s.lessons.map((l) => ({
          ...l,
          exerciseCount: exercises.filter((e) => e.lessonId === l.id).length,
        })),
        exerciseCount: exs.length,
        completedExerciseCount: exs.filter((e) => done.has(e.id)).length,
      }
    }),
  }
}

function toSubmission(s: StoredSubmission): Submission {
  const ex = exercises.find((e) => e.id === s.exerciseId)!
  return {
    id: s.id,
    exerciseId: s.exerciseId,
    exerciseTitle: ex.title,
    skillType: ex.skillType,
    exerciseType: ex.exerciseType,
    courseId: ex.courseId,
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

function toDetail(s: StoredSubmission): SubmissionDetail {
  const ex = exercises.find((e) => e.id === s.exerciseId)!
  return { ...toSubmission(s), answers: s.answers, results: s.results, exercise: ex }
}

function averageBand(userId: string, skill: SkillType) {
  const bands = userSubmissions(userId)
    .filter((s) => {
      const ex = exercises.find((e) => e.id === s.exerciseId)
      return ex?.skillType === skill && ex.exerciseType === 'PRACTICE'
    })
    .map((s) => estimateBand(skill, s.correctCount, s.questionCount) ?? 0)
  if (!bands.length) return null
  return Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2
}

export const handlers = [
  // ---------------------------------------------------------------- auth
  http.post(`${API}/auth/login`, async ({ request }) => {
    await delay(LATENCY)
    const { email, password } = (await request.json()) as { email: string; password: string }
    const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user || user.password !== password) return fail(401, 'Email hoặc mật khẩu không đúng.')
    return HttpResponse.json({ accessToken: tokenFor(user.id), user: publicUser(user) })
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as { fullName: string; email: string; password: string }
    if (db.users.some((u) => u.email.toLowerCase() === body.email.trim().toLowerCase())) {
      return fail(409, 'Email này đã được đăng ký.')
    }
    const user = {
      id: `u-${crypto.randomUUID()}`,
      email: body.email.trim(),
      fullName: body.fullName.trim(),
      password: body.password,
      avatarUrl: null,
      bio: null,
      phone: null,
      role: 'STUDENT' as const,
    }
    db.users.push(user)
    persist()
    return HttpResponse.json({ accessToken: tokenFor(user.id), user: publicUser(user) })
  }),

  // ---------------------------------------------------------------- user
  http.get(`${API}/users/me`, ({ request }) => {
    const user = currentUser(request)
    return user ? HttpResponse.json(publicUser(user)) : fail(401, 'Phiên đăng nhập đã hết hạn.')
  }),

  http.put(`${API}/users/me`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.')
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

  // ---------------------------------------------------------------- dashboard & courses
  http.get(`${API}/dashboard/me`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    const stats: DashboardStats = {
      courseCount: courses.length,
      completedCourseCount: courses.filter((c) => c.enrollmentStatus === 'COMPLETED').length,
      submissionCount: userSubmissions(user.id).length,
      exercisesDone: doneIds(user.id).size,
      readingBand: averageBand(user.id, 'READING'),
      listeningBand: averageBand(user.id, 'LISTENING'),
    }
    return HttpResponse.json(stats)
  }),

  http.get(`${API}/courses/my`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    return HttpResponse.json(courses.map((c) => courseSummary(c, user.id)))
  }),

  http.get(`${API}/courses/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    const course = courses.find((c) => c.id === params.id)
    return course
      ? HttpResponse.json(courseDetail(course, user.id))
      : fail(404, 'Không tìm thấy khóa học.')
  }),

  http.get(`${API}/sections/:id/exercises`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    return HttpResponse.json(
      exercises.filter((e) => e.sectionId === params.id).map((e) => summary(e, user.id)),
    )
  }),

  http.get(`${API}/lessons/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    if (!currentUser(request)) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    const lesson = courses
      .flatMap((c) => c.sections.flatMap((s) => s.lessons))
      .find((l) => l.id === params.id)
    if (!lesson) return fail(404, 'Không tìm thấy bài học.')
    const result: Lesson = {
      ...lesson,
      exerciseCount: exercises.filter((e) => e.lessonId === lesson.id).length,
    }
    return HttpResponse.json(result)
  }),

  http.get(`${API}/lessons/:id/exercises`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    return HttpResponse.json(
      exercises.filter((e) => e.lessonId === params.id).map((e) => summary(e, user.id)),
    )
  }),

  // ---------------------------------------------------------------- exercises & submissions
  http.get(`${API}/exercises/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    if (!currentUser(request)) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    const ex = exercises.find((e) => e.id === params.id)
    return ex ? HttpResponse.json(forLearner(ex)) : fail(404, 'Không tìm thấy bài tập.')
  }),

  http.post(`${API}/exercises/:id/check`, async ({ request, params }) => {
    await delay(150)
    if (!currentUser(request)) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    const ex = exercises.find((e) => e.id === params.id)
    if (!ex) return fail(404, 'Không tìm thấy bài tập.')
    const { questionId, answer } = (await request.json()) as {
      questionId: string
      answer: AnswerValue
    }
    const question = allQuestions(ex).find((x) => x.id === questionId)
    if (!question) return fail(404, 'Không tìm thấy câu hỏi.')
    const correctOptions = question.options.filter((o) => o.isCorrect)
    const body: CheckAnswerResponse = {
      correct: gradeQuestion(question, answer),
      correctOptionIds: correctOptions.map((o) => o.id),
      acceptedAnswers: correctOptions.map((o) => o.optionText),
      explanation: question.explanation ?? null,
    }
    return HttpResponse.json(body)
  }),

  http.post(`${API}/submissions`, async ({ request }) => {
    await delay(500)
    const user = currentUser(request)
    if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    const body = (await request.json()) as {
      exerciseId: string
      answers: Answers
      timeSpent: number
    }
    const ex = exercises.find((e) => e.id === body.exerciseId)
    if (!ex) return fail(404, 'Không tìm thấy bài tập.')
    const previous = userSubmissions(user.id).filter((s) => s.exerciseId === ex.id).length
    if (previous >= ex.maxAttempts) return fail(400, 'Bạn đã hết lượt làm bài này.')
    const stored: StoredSubmission = {
      id: `sub-${crypto.randomUUID()}`,
      userId: user.id,
      exerciseId: ex.id,
      attemptNumber: previous + 1,
      answers: body.answers,
      ...gradeExercise(ex, body.answers),
      timeSpent: Math.round(body.timeSpent),
      submittedAt: new Date().toISOString(),
    }
    db.submissions.push(stored)
    persist()
    return HttpResponse.json(toDetail(stored))
  }),

  http.get(`${API}/submissions/me`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    return HttpResponse.json(
      userSubmissions(user.id)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map(toSubmission),
    )
  }),

  http.get(`${API}/submissions/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return fail(401, 'Phiên đăng nhập đã hết hạn.')
    const s = db.submissions.find((x) => x.id === params.id && x.userId === user.id)
    return s ? HttpResponse.json(toDetail(s)) : fail(404, 'Không tìm thấy bài nộp.')
  }),
]
