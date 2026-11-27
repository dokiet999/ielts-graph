import { delay, http, HttpResponse } from 'msw'
import { gradeQuestion } from '@/lib/grading'
import type {
  BeAdminCourseDetail,
  BeAdminCourseSummary,
  BeAdminLesson,
  BeAdminSection,
  BeCategory,
  BeCourse,
  BeCourseDetail,
  BeCourseProgressOverview,
  BeCourseStudentProgressItem,
  BeExercise,
  BeExerciseSummary,
  BeFinalTestSession,
  BeFinalTestStatus,
  BeLessonDetail,
  BeMyCourse,
  BeReviewQueueItem,
  BeSectionFinalTestProgress,
  BeSpeakingResult,
  BeStudentAccount,
  BeStudentCourseProgressDetail,
  BeSubmissionDetail,
  BeSubmissionSummary,
  BeSubmitResult,
  BeTeacherAccount,
  BeTeacherCourseSummary,
  BeTeacherExerciseDetail,
  BeTeacherExerciseSummary,
  BeTeacherLessonExercises,
  BeWritingResult,
} from '@/lib/backend-types'
import {
  isSupportedAudioFilename,
  SPEAKING_MAX_DURATION_SEC,
  SPEAKING_MAX_FILE_BYTES,
  SPEAKING_MIN_DURATION_SEC,
} from '@/lib/speaking'
import type {
  AnswerValue,
  CheckAnswerResponse,
  ContentStatus,
  DifficultyLevel,
  Exercise,
  ExerciseType,
  ProfileSkill,
  QuestionType,
  SkillType,
  User,
  UserStatus,
} from '@/lib/types'
import {
  allQuestions,
  db,
  gradeExercise,
  persist,
  type StoredSubmission,
  type StoredUser,
} from './db'
import { courses, exercises, type CourseRecord } from './fixtures/courses'
import { personalizationFixture } from './fixtures/personalization'
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
const okPage = <T>(items: T[], page: number, size: number) => {
  const safePage = Math.max(0, page)
  const safeSize = Math.max(1, size)
  const slice = items.slice(safePage * safeSize, (safePage + 1) * safeSize)
  return HttpResponse.json({
    meta: { code: 200, page: safePage, size: safeSize, total: items.length },
    data: slice,
  })
}

const targetBands = new Map<string, Partial<Record<ProfileSkill, number>>>()

/** Backend error format: { code, message, details, timestamp }. */
const fail = (status: number, code: string, message: string, details?: unknown) =>
  HttpResponse.json(
    { code, message, details: details ?? null, timestamp: new Date().toISOString() },
    { status },
  )
const unauthorized = () => fail(401, 'UNAUTHORIZED', 'Phiên đăng nhập đã hết hạn.')
const forbidden = () => fail(403, 'FORBIDDEN', 'Bạn không có quyền truy cập chức năng này.')

const publicUser = ({
  password: _password,
  isActive: _isActive,
  emailVerified: _emailVerified,
  lockReason: _lockReason,
  createdAt: _createdAt,
  updatedAt: _updatedAt,
  ...u
}: StoredUser): User => u

function toTeacherAccount(u: StoredUser, temporaryPassword?: string | null): BeTeacherAccount {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone ?? null,
    bio: u.bio ?? null,
    role: u.role,
    status: u.status,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    lockReason: u.lockReason,
    courseCount: db.moderationCourses.filter((c) => c.teacherId === u.id).length,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    ...(temporaryPassword ? { temporaryPassword } : {}),
  }
}

function toStudentAccount(u: StoredUser): BeStudentAccount {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone ?? null,
    role: u.role,
    status: u.status,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    lockReason: u.lockReason,
    enrollmentCount:
      (u.id === 'u-demo' ? courses.filter((c) => c.enrolledAt).length : 0) +
      db.studentEnrollments.filter((e) => e.userId === u.id).length,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }
}

function activeEnrollmentCountForCourse(courseId: string): number {
  return db.studentEnrollments.filter((e) => e.courseId === courseId).length
}

function toCategoryDto(cat: BeCategory): BeCategory {
  return {
    ...cat,
    courseCount: db.moderationCourses.filter((c) => c.categoryId === cat.id).length,
  }
}

function toAdminCourseSummary(c: BeAdminCourseDetail): BeAdminCourseSummary {
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? null,
    thumbnail: c.thumbnail ?? null,
    teacherId: c.teacherId,
    teacherName: c.teacherName,
    categoryId: c.categoryId ?? null,
    categoryName: c.categoryName ?? null,
    skillFocus: c.skillFocus ?? null,
    difficultyLevel: c.difficultyLevel ?? null,
    estimatedDuration: c.estimatedDuration ?? null,
    maxStudents: c.maxStudents ?? null,
    startDate: c.startDate ?? null,
    endDate: c.endDate ?? null,
    isFeatured: c.isFeatured,
    isActive: c.isActive,
    status: c.status,
    publishedAt: c.publishedAt ?? null,
    submittedAt: c.submittedAt ?? null,
    reviewedAt: c.reviewedAt ?? null,
    reviewNote: c.reviewNote ?? null,
    deactivationReason: c.deactivationReason ?? null,
    totalLessons: c.sections.reduce((n, s) => n + s.lessons.length, 0),
    enrollmentCount: activeEnrollmentCountForCourse(c.id),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

function slugify(input: string): string {
  return input
    .trim()
    .replaceAll('đ', 'd')
    .replaceAll('Đ', 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function waitingDays(submittedAt: string | null | undefined): number {
  if (!submittedAt) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(submittedAt).getTime()) / 86_400_000))
}

function toCourseReviewItem(c: BeAdminCourseDetail): BeReviewQueueItem {
  const pendingLessonCount = c.sections
    .flatMap((s) => s.lessons)
    .filter((l) => l.status === 'PENDING_REVIEW').length
  return {
    id: c.id,
    title: c.title,
    teacherName: c.teacherName,
    skillFocus: c.skillFocus ?? null,
    status: c.status,
    submittedAt: c.submittedAt ?? null,
    waitingDays: waitingDays(c.submittedAt),
    reviewedAt: c.reviewedAt ?? null,
    reviewNote: c.reviewNote ?? null,
    pendingLessonCount,
  }
}

function toTeacherCourseSummary(c: BeAdminCourseDetail): BeTeacherCourseSummary {
  const lessons = c.sections.flatMap((s) => s.lessons)
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? null,
    skillFocus: c.skillFocus ?? null,
    difficultyLevel: c.difficultyLevel ?? null,
    categoryId: c.categoryId ?? null,
    categoryName: c.categoryName ?? null,
    thumbnail: c.thumbnail ?? null,
    estimatedDuration: c.estimatedDuration ?? null,
    maxStudents: c.maxStudents ?? null,
    startDate: c.startDate ?? null,
    endDate: c.endDate ?? null,
    enrollmentCount: activeEnrollmentCountForCourse(c.id),
    status: c.status,
    submittedAt: c.submittedAt ?? null,
    reviewedAt: c.reviewedAt ?? null,
    reviewNote: c.reviewNote ?? null,
    deactivationReason: c.deactivationReason ?? null,
    publishedAt: c.publishedAt ?? null,
    isActive: c.isActive,
    totalLessons: lessons.length,
    pendingLessonCount: lessons.filter((l) => l.status === 'PENDING_REVIEW').length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

function withLessonExerciseCounts(c: BeAdminCourseDetail): BeAdminCourseDetail {
  return {
    ...c,
    enrollmentCount: activeEnrollmentCountForCourse(c.id),
    sections: c.sections.map((s) => ({
      ...s,
      lessons: s.lessons.map((l) => ({
        ...l,
        exerciseCount: db.teacherExercises.filter((e) => e.lessonId === l.id).length,
      })),
    })),
  }
}

function toTeacherExerciseSummary(ex: BeTeacherExerciseDetail): BeTeacherExerciseSummary {
  return {
    id: ex.id,
    lessonId: ex.lessonId,
    title: ex.title,
    instruction: ex.instruction ?? null,
    audioUrl: ex.audioUrl ?? null,
    exerciseType: ex.exerciseType,
    skillType: ex.skillType,
    timeLimit: ex.timeLimit ?? null,
    maxAttempts: ex.maxAttempts,
    passingScore: ex.passingScore,
    ordering: ex.ordering,
    questionCount: ex.totalQuestions,
    submissionCount: ex.submissionCount,
    createdAt: ex.createdAt,
    updatedAt: ex.updatedAt,
  }
}

function findTeacherLessonContext(lessonId: string) {
  for (const c of db.moderationCourses) {
    for (const s of c.sections) {
      const lesson = s.lessons.find((l) => l.id === lessonId)
      if (lesson) return { course: c, section: s, lesson }
    }
  }
  return null
}

const MOCK_OBJECTIVE_TYPES = new Set<QuestionType>([
  'MULTIPLE_CHOICE',
  'DROPLIST',
  'TRUE_FALSE',
  'MATCHING',
])
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
  const studentGrant = db.studentFinalTestGrants.find(
    (g) => g.sectionId === sectionId && g.userId === userId,
  )
  const grant: MockFinalTestGrant | undefined = studentGrant
    ? {
        sectionId: studentGrant.sectionId,
        userId: studentGrant.userId,
        unlocked: studentGrant.unlocked,
        deadlineDays: studentGrant.deadlineDays,
        grantedAt: studentGrant.unlockedAt,
        expiresAt: studentGrant.expiresAt,
      }
    : finalTestGrants.get(sectionId)
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

function findAnyExerciseMeta(exerciseId: string): {
  id: string
  title: string
  skillType: string
  exerciseType: string
  courseId: string | null
  sectionId: string | null
} | null {
  const staticEx = exercises.find((e) => e.id === exerciseId)
  if (staticEx) return staticEx
  const teacherEx = db.teacherExercises.find((e) => e.id === exerciseId)
  if (!teacherEx) return null
  return {
    id: teacherEx.id,
    title: teacherEx.title,
    skillType: teacherEx.skillType,
    exerciseType: teacherEx.exerciseType,
    courseId: teacherEx.courseId,
    sectionId: teacherEx.sectionId,
  }
}

function teacherExerciseToBeExercise(ex: BeTeacherExerciseDetail, review = false): BeExercise {
  return {
    id: ex.id,
    lessonId: ex.lessonId,
    sectionId: ex.sectionId,
    courseId: ex.courseId,
    title: ex.title,
    instruction: ex.instruction ?? null,
    audioUrl: ex.audioUrl ?? null,
    content: ex.content ?? null,
    exerciseType: ex.exerciseType,
    skillType: ex.skillType,
    timeLimit: ex.timeLimit ?? null,
    maxAttempts: ex.maxAttempts,
    questionGroups: ex.questionGroups.map((g, gi) => ({
      id: g.id ?? `tqg-${gi}`,
      groupTitle: g.groupTitle ?? null,
      groupInstruction: g.groupInstruction ?? null,
      questionType: g.questionType ?? 'MULTIPLE_CHOICE',
      questionRange: g.questionRange ?? null,
      imageUrl: g.imageUrl ?? null,
      ordering: g.ordering ?? gi + 1,
      questions: g.questions.map((q, qi) => ({
        id: q.id ?? `tq-${qi}`,
        ordering: q.ordering ?? qi + 1,
        questionText: q.questionText,
        questionType: q.questionType,
        points: q.points,
        ...(review && { explanation: q.explanation ?? null }),
        options: q.options.map((o, oi) => ({
          id: o.id ?? `to-${oi}`,
          optionText: o.optionText,
          ordering: o.ordering ?? oi + 1,
          ...(review && { isCorrect: Boolean(o.isCorrect) }),
        })),
      })),
    })),
  }
}

function toBeSubmission(s: StoredSubmission): BeSubmissionSummary {
  const ex = findAnyExerciseMeta(s.exerciseId)!
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
    aiScore: s.aiScore ?? null,
    teacherScore: s.teacherScore ?? null,
    teacherFeedback: s.teacherFeedback ?? null,
    gradingMethod: s.gradingMethod ?? null,
    gradedByName: s.gradedByName ?? null,
    gradedAt: s.gradedAt ?? null,
    correctCount: s.correctCount,
    questionCount: s.questionCount,
    timeSpent: s.timeSpent,
    submittedAt: s.submittedAt,
  }
}

function toBeSubmissionDetail(s: StoredSubmission): BeSubmissionDetail {
  const staticEx = exercises.find((e) => e.id === s.exerciseId)
  const teacherEx = !staticEx ? db.teacherExercises.find((e) => e.id === s.exerciseId) : undefined
  const student = db.users.find((u) => u.id === s.userId)
  return {
    ...toBeSubmission(s),
    studentId: student?.id ?? s.userId,
    studentName: student?.fullName ?? null,
    studentEmail: student?.email ?? null,
    answers: s.answers,
    results: s.results,
    exercise: staticEx ? toBeExercise(staticEx, true) : teacherExerciseToBeExercise(teacherEx!, true),
    aiStructuredFeedback: (s.aiStructuredFeedback ??
      null) as BeSubmissionDetail['aiStructuredFeedback'],
  }
}

function computeMockScheduleStatus(
  course: BeAdminCourseDetail,
  enrolledAt: string,
  completedExercises: number,
  totalExercises: number,
  progressPercent: number,
  lastSubmittedAt: string | null,
): string {
  if (totalExercises > 0 && completedExercises >= totalExercises) return 'COMPLETED'
  const now = Date.now()
  if (course.startDate && now < new Date(course.startDate).getTime()) return 'PRE_ENROLLED'
  if (course.startDate && course.endDate) {
    const startMs = new Date(course.startDate).getTime()
    const endMs = new Date(course.endDate).getTime()
    if (endMs > startMs && now > startMs) {
      const elapsed = Math.min(100, Math.max(0, ((now - startMs) * 100) / (endMs - startMs)))
      if (elapsed - progressPercent >= 25) return 'BEHIND'
    }
  }
  const baseline =
    lastSubmittedAt ??
    (course.startDate && new Date(course.startDate).getTime() > new Date(enrolledAt).getTime()
      ? course.startDate
      : enrolledAt)
  if ((now - new Date(baseline).getTime()) / 86_400_000 >= 7) return 'INACTIVE'
  return 'ON_TRACK'
}

function buildMockSectionFinalTestProgress(
  course: BeAdminCourseDetail,
  sectionId: string,
  studentId: string,
): BeSectionFinalTestProgress | null {
  const finalEx =
    db.teacherExercises.find(
      (e) => e.courseId === course.id && e.sectionId === sectionId && e.exerciseType === 'FINAL_TEST',
    ) ??
    db.teacherExercises.find((e) => e.courseId === course.id && e.exerciseType === 'FINAL_TEST')
  if (!finalEx) return null
  const grant = db.studentFinalTestGrants.find(
    (g) => g.courseId === course.id && g.sectionId === sectionId && g.userId === studentId,
  )
  const nowMs = Date.now()
  const grantExpired = grant ? new Date(grant.expiresAt).getTime() <= nowMs : false
  const unlocked = Boolean(grant && grant.unlocked && !grantExpired)
  const subs = db.submissions
    .filter((s) => s.userId === studentId && s.exerciseId === finalEx.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  return {
    exerciseId: finalEx.id,
    exerciseTitle: finalEx.title,
    unlocked,
    grantExpired,
    deadlineDays: grant?.deadlineDays ?? null,
    unlockedAt: grant?.unlockedAt ?? null,
    grantExpiresAt: grant?.expiresAt ?? null,
    attemptCount: subs.length,
    bestScore: subs.length > 0 ? Math.max(...subs.map((s) => s.score)) : null,
    latestSubmissionId: subs[0]?.id ?? null,
  }
}

function buildMockCourseStudents(
  course: BeAdminCourseDetail,
  q: string,
  scheduleStatus: string,
): BeCourseProgressOverview {
  const approvedLessonIds = new Set(
    course.sections.flatMap((s) => s.lessons).filter((l) => l.status === 'APPROVED').map((l) => l.id),
  )
  const countableExercises = db.teacherExercises.filter(
    (e) =>
      approvedLessonIds.has(e.lessonId) &&
      e.totalQuestions > 0 &&
      e.exerciseType !== 'MOCK_TEST' &&
      e.exerciseType !== 'FINAL_TEST',
  )
  const countableIds = new Set(countableExercises.map((e) => e.id))
  const totalExercises = countableExercises.length
  const enrollments = db.studentEnrollments.filter((e) => e.courseId === course.id)
  const allCourseExerciseIds = new Set(
    db.teacherExercises.filter((e) => e.courseId === course.id).map((e) => e.id),
  )

  const items: BeCourseStudentProgressItem[] = enrollments
    .map((enr): BeCourseStudentProgressItem | null => {
      const student = db.users.find((u) => u.id === enr.userId)
      if (!student) return null
      const subs = db.submissions
        .filter((s) => s.userId === student.id && allCourseExerciseIds.has(s.exerciseId))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      const completed = new Set(subs.filter((s) => countableIds.has(s.exerciseId)).map((s) => s.exerciseId))
      const progressPercent =
        totalExercises > 0 ? Math.round((completed.size * 1000) / totalExercises) / 10 : 0
      const ratios = subs.filter((s) => s.maxScore > 0).map((s) => (s.score * 100) / s.maxScore)
      const averageScore =
        ratios.length > 0
          ? Math.round((ratios.reduce((a, b) => a + b, 0) * 10) / ratios.length) / 10
          : null
      const pendingReviewCount = subs.filter((s) => {
        const meta = findAnyExerciseMeta(s.exerciseId)
        return (
          meta &&
          (meta.skillType === 'WRITING' || meta.skillType === 'SPEAKING') &&
          !s.teacherFeedback
        )
      }).length
      const lastSubmittedAt: string | null = subs[0]?.submittedAt ?? null
      return {
        studentId: student.id,
        fullName: student.fullName,
        username: student.username,
        email: student.email,
        enrolledAt: enr.enrolledAt,
        completedAt: enr.completedAt,
        completedExercises: completed.size,
        totalExercises,
        progressPercent,
        averageScore,
        totalSubmissions: subs.length,
        pendingReviewCount,
        lastSubmittedAt,
        scheduleStatus: computeMockScheduleStatus(
          course,
          enr.enrolledAt,
          completed.size,
          totalExercises,
          progressPercent,
          lastSubmittedAt,
        ),
      }
    })
    .filter((x): x is BeCourseStudentProgressItem => x !== null)

  const needle = q.trim().toLowerCase()
  const filterStatus = scheduleStatus.trim().toUpperCase()
  const filtered = items
    .filter(
      (i) =>
        !needle ||
        i.fullName.toLowerCase().includes(needle) ||
        i.email.toLowerCase().includes(needle) ||
        i.username.toLowerCase().includes(needle),
    )
    .filter((i) => !filterStatus || i.scheduleStatus === filterStatus)

  return {
    courseId: course.id,
    courseTitle: course.title,
    maxStudents: course.maxStudents ?? null,
    activeStudentCount: items.length,
    startDate: course.startDate ?? null,
    endDate: course.endDate ?? null,
    totalExercises,
    averageProgressPercent:
      items.length > 0
        ? Math.round(
            (items.reduce((sum, i) => sum + i.progressPercent, 0) * 10) / items.length,
          ) / 10
        : 0,
    completedCount: items.filter((i) => i.scheduleStatus === 'COMPLETED').length,
    behindOrInactiveCount: items.filter(
      (i) => i.scheduleStatus === 'BEHIND' || i.scheduleStatus === 'INACTIVE',
    ).length,
    preEnrolledCount: items.filter((i) => i.scheduleStatus === 'PRE_ENROLLED').length,
    students: filtered,
  }
}

function buildMockStudentProgressDetail(
  course: BeAdminCourseDetail,
  studentId: string,
): BeStudentCourseProgressDetail | null {
  const enr = db.studentEnrollments.find((e) => e.courseId === course.id && e.userId === studentId)
  const student = db.users.find((u) => u.id === studentId)
  if (!enr || !student) return null

  const allCourseEx = db.teacherExercises.filter((e) => e.courseId === course.id)
  const allCourseExIds = new Set(allCourseEx.map((e) => e.id))
  const subs = db.submissions
    .filter((s) => s.userId === studentId && allCourseExIds.has(s.exerciseId))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))

  let courseTotal = 0
  let courseCompleted = 0
  const sections = course.sections.map((sec) => {
    let secTotal = 0
    let secCompleted = 0
    const lessons = sec.lessons
      .filter((l) => l.status === 'APPROVED')
      .map((les) => {
        let lesTotal = 0
        let lesCompleted = 0
        const lesExercises = db.teacherExercises
          .filter((e) => e.lessonId === les.id && e.exerciseType !== 'FINAL_TEST')
          .map((ex) => {
            const exSubs = subs.filter((s) => s.exerciseId === ex.id)
            const completed = exSubs.length > 0
            const countable =
              ex.totalQuestions > 0 &&
              ex.exerciseType !== 'MOCK_TEST' &&
              ex.exerciseType !== 'FINAL_TEST'
            if (countable) {
              lesTotal++
              if (completed) lesCompleted++
            }
            const max = ex.skillType === 'WRITING' || ex.skillType === 'SPEAKING' ? 9 : ex.totalQuestions
            return {
              exerciseId: ex.id,
              title: ex.title,
              exerciseType: ex.exerciseType,
              skillType: ex.skillType,
              questionCount: ex.totalQuestions,
              maxScore: max,
              attemptCount: exSubs.length,
              bestScore: exSubs.length > 0 ? Math.max(...exSubs.map((s) => s.score)) : null,
              completed,
              latestSubmissionId: exSubs[0]?.id ?? null,
              latestStatus: exSubs[0] ? 'GRADED' : null,
              lastSubmittedAt: exSubs[0]?.submittedAt ?? null,
              hasTeacherFeedback: exSubs.some((s) => Boolean(s.teacherFeedback)),
            }
          })
        secTotal += lesTotal
        secCompleted += lesCompleted
        return {
          lessonId: les.id,
          title: les.title,
          lessonType: les.lessonType,
          ordering: les.ordering,
          completedExercises: lesCompleted,
          totalExercises: lesTotal,
          exercises: lesExercises,
        }
      })
    courseTotal += secTotal
    courseCompleted += secCompleted
    return {
      sectionId: sec.id,
      title: sec.title,
      ordering: sec.ordering,
      completedExercises: secCompleted,
      totalExercises: secTotal,
      finalTest: buildMockSectionFinalTestProgress(course, sec.id, studentId),
      lessons,
    }
  })

  const progressPercent =
    courseTotal > 0 ? Math.round((courseCompleted * 1000) / courseTotal) / 10 : 0
  const ratios = subs.filter((s) => s.maxScore > 0).map((s) => (s.score * 100) / s.maxScore)
  const averageScore =
    ratios.length > 0
      ? Math.round((ratios.reduce((a, b) => a + b, 0) * 10) / ratios.length) / 10
      : null
  const lastSubmittedAt = subs[0]?.submittedAt ?? null

  return {
    courseId: course.id,
    courseTitle: course.title,
    startDate: course.startDate ?? null,
    endDate: course.endDate ?? null,
    maxStudents: course.maxStudents ?? null,
    studentId: student.id,
    fullName: student.fullName,
    username: student.username,
    email: student.email,
    enrolledAt: enr.enrolledAt,
    completedAt: enr.completedAt,
    completedExercises: courseCompleted,
    totalExercises: courseTotal,
    progressPercent,
    averageScore,
    lastSubmittedAt,
    scheduleStatus: computeMockScheduleStatus(
      course,
      enr.enrolledAt,
      courseCompleted,
      courseTotal,
      progressPercent,
      lastSubmittedAt,
    ),
    sections,
    submissions: subs.map((s) => {
      const ex = findAnyExerciseMeta(s.exerciseId)!
      return {
        id: s.id,
        exerciseId: s.exerciseId,
        exerciseTitle: ex.title,
        skillType: ex.skillType,
        exerciseType: ex.exerciseType,
        attemptNumber: s.attemptNumber,
        status: 'GRADED',
        score: s.score,
        maxScore: s.maxScore,
        aiScore: s.aiScore ?? null,
        teacherScore: s.teacherScore ?? null,
        teacherFeedback: s.teacherFeedback ?? null,
        gradingMethod: s.gradingMethod ?? null,
        gradedByName: s.gradedByName ?? null,
        gradedAt: s.gradedAt ?? null,
        submittedAt: s.submittedAt,
        timeSpent: s.timeSpent,
      }
    }),
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
    if (user.status === 'PENDING') {
      return fail(401, 'ACCOUNT_PENDING', 'Account is waiting for admin approval')
    }
    if (user.status === 'LOCKED') {
      return fail(401, 'ACCOUNT_LOCKED', 'Account is locked')
    }
    return ok({ accessToken: tokenFor(user.id), user: publicUser(user) })
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    await delay(LATENCY)
    const body = (await request.json()) as { fullName: string; email: string; password: string }
    if (db.users.some((u) => u.email.toLowerCase() === body.email.trim().toLowerCase())) {
      return fail(409, 'CONFLICT', 'Email này đã được đăng ký.')
    }
    const now = new Date().toISOString()
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
      status: 'ACTIVE',
      isActive: true,
      emailVerified: false,
      lockReason: null,
      createdAt: now,
      updatedAt: now,
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
  http.get(`${API}/courses`, async ({ request }) => {
    await delay(LATENCY)
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const skill = url.searchParams.get('skill') ?? ''
    const page = Number(url.searchParams.get('page') ?? 0) || 0
    const size = Number(url.searchParams.get('size') ?? 20) || 20

    const publishedFromMod = db.moderationCourses
      .filter((c) => c.status === 'APPROVED' && c.isActive && Boolean(c.publishedAt))
      .map(
        (c): BeCourse => ({
          id: c.id,
          teacherId: c.teacherId,
          teacherName: c.teacherName,
          categoryName: c.categoryName ?? null,
          title: c.title,
          description: c.description ?? null,
          thumbnail: c.thumbnail ?? null,
          skillFocus: c.skillFocus ?? 'READING',
          difficultyLevel: c.difficultyLevel ?? 'INTERMEDIATE',
          estimatedDuration: c.estimatedDuration ?? null,
          maxStudents: c.maxStudents ?? null,
          startDate: c.startDate ?? null,
          endDate: c.endDate ?? null,
          enrollmentCount: activeEnrollmentCountForCourse(c.id),
          publishedAt: c.publishedAt ?? null,
          createdAt: c.createdAt,
        }),
      )
    const allCatalog: BeCourse[] = [
      ...publishedFromMod,
      ...courses.map((c) => ({
        ...toBeCourse(c),
        enrollmentCount: activeEnrollmentCountForCourse(c.id) + 1,
      })),
    ]
      .filter((c) => !skill || c.skillFocus === skill)
      .filter((c) => !q || c.title.toLowerCase().includes(q))

    return okPage(allCatalog, page, size)
  }),

  http.post(`${API}/courses/:id/enroll`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'STUDENT') return forbidden()
    const courseId = String(params.id)

    const existing = db.studentEnrollments.find(
      (e) => e.courseId === courseId && e.userId === user.id,
    )
    if (existing) {
      return ok({
        id: `enr-${courseId}-${user.id}`,
        courseId,
        enrollmentDate: existing.enrolledAt,
        progressPercentage: 0,
        completionDate: existing.completedAt,
        created: false,
      })
    }

    const mod = db.moderationCourses.find(
      (c) => c.id === courseId && c.status === 'APPROVED' && c.isActive,
    )
    if (!mod && !courses.some((c) => c.id === courseId)) {
      return fail(404, 'NOT_FOUND', 'Course not found')
    }
    if (mod) {
      if (mod.endDate && Date.now() > new Date(mod.endDate).getTime()) {
        return fail(409, 'COURSE_ENDED', 'Khóa học đã kết thúc thời gian đăng ký')
      }
      const currentCount = activeEnrollmentCountForCourse(courseId)
      if (mod.maxStudents !== null && mod.maxStudents !== undefined && currentCount >= mod.maxStudents) {
        return fail(409, 'COURSE_FULL', 'Khóa học đã đủ số lượng học viên tối đa')
      }
    }

    const now = new Date().toISOString()
    db.studentEnrollments.push({
      courseId,
      userId: user.id,
      enrolledAt: now,
      completedAt: null,
    })
    persist()
    return ok(
      {
        id: `enr-${courseId}-${user.id}`,
        courseId,
        enrollmentDate: now,
        progressPercentage: 0,
        completionDate: null,
        created: true,
      },
      201,
    )
  }),

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
    if (course) {
      return ok(toBeCourseDetail(course, user.id))
    }
    const mod = db.moderationCourses.find((c) => c.id === params.id && c.status === 'APPROVED' && c.isActive)
    if (!mod) return fail(404, 'NOT_FOUND', 'Course not found')
    const enr = db.studentEnrollments.find((e) => e.courseId === mod.id && e.userId === user.id)
    return ok({
      course: {
        id: mod.id,
        teacherId: mod.teacherId,
        teacherName: mod.teacherName,
        categoryName: mod.categoryName ?? null,
        title: mod.title,
        description: mod.description ?? null,
        thumbnail: mod.thumbnail ?? null,
        skillFocus: mod.skillFocus ?? 'READING',
        difficultyLevel: mod.difficultyLevel ?? 'INTERMEDIATE',
        estimatedDuration: mod.estimatedDuration ?? null,
        maxStudents: mod.maxStudents ?? null,
        startDate: mod.startDate ?? null,
        endDate: mod.endDate ?? null,
        enrollmentCount: activeEnrollmentCountForCourse(mod.id),
        publishedAt: mod.publishedAt ?? null,
      },
      totalLessons: mod.totalLessons,
      exerciseCount: 0,
      completedExerciseCount: 0,
      enrollment: enr ? { enrolledAt: enr.enrolledAt, completedAt: enr.completedAt } : null,
      sections: mod.sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        ordering: s.ordering,
        exerciseCount: 0,
        completedExerciseCount: 0,
        lessons: s.lessons.filter((l) => l.status === 'APPROVED').map((l) => ({
          id: l.id,
          sectionId: s.id,
          title: l.title,
          lessonType: l.lessonType,
          videoDuration: l.videoDuration ?? null,
          ordering: l.ordering,
          isPreview: l.isPreview,
          exerciseCount: 0,
        })),
      })),
    } satisfies BeCourseDetail)
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
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') return forbidden()
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
    if (user.role !== 'ADMIN' && user.role !== 'TEACHER') return forbidden()
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

  // Personalization tab: same shape as GET /api/personalization; the target bands live in memory.
  http.get(`${API}/personalization`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (localStorage.getItem(MOCK_KG_DOWN_KEY) === '1') {
      return fail(
        503,
        'KG_UNAVAILABLE',
        'The knowledge graph is temporarily unavailable. Please try again later',
      )
    }
    return ok(personalizationFixture(targetBands.get(user.id) ?? {}))
  }),

  http.put(`${API}/personalization/target-band`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    const body = (await request.json()) as { skill?: string; targetBand?: number }
    if (body.skill !== 'WRITING' && body.skill !== 'SPEAKING') {
      return fail(400, 'INVALID_SKILL', 'skill must be WRITING or SPEAKING')
    }
    const band = Number(body.targetBand)
    if (!(band >= 4 && band <= 9) || (band * 2) % 1 !== 0) {
      return fail(
        400,
        'INVALID_TARGET_BAND',
        'targetBand must be a multiple of 0.5 between 4.0 and 9.0',
      )
    }
    const targets = { ...(targetBands.get(user.id) ?? {}), [body.skill]: band }
    targetBands.set(user.id, targets)
    return ok(personalizationFixture(targets))
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
    const meta = findAnyExerciseMeta(s.exerciseId)
    const owningCourse = meta?.courseId ? db.moderationCourses.find((c) => c.id === meta.courseId) : null
    const isTeacherOwner = user.role === 'TEACHER' && owningCourse?.teacherId === user.id
    if (s.userId !== user.id && user.role !== 'ADMIN' && !isTeacherOwner) {
      return fail(403, 'FORBIDDEN', 'Access denied to this submission')
    }
    return ok(toBeSubmissionDetail(s))
  }),

  // ---------------------------------------------------------------- categories
  http.get(`${API}/categories`, async () => {
    await delay(LATENCY)
    const active = db.categories
      .filter((c) => c.isActive)
      .sort((a, b) => a.ordering - b.ordering || a.name.localeCompare(b.name))
      .map(toCategoryDto)
    return ok(active)
  }),

  // ---------------------------------------------------------------- admin
  http.get(`${API}/admin/categories`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const url = new URL(request.url)
    const rawActive = url.searchParams.get('isActive')
    const filterActive = rawActive === null || rawActive === '' ? undefined : rawActive === 'true'
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const page = Number(url.searchParams.get('page') ?? 0) || 0
    const size = Number(url.searchParams.get('size') ?? 10) || 10

    const filtered = db.categories
      .filter((c) => filterActive === undefined || c.isActive === filterActive)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      .sort((a, b) => a.ordering - b.ordering || a.name.localeCompare(b.name))
      .map(toCategoryDto)

    return okPage(filtered, page, size)
  }),

  http.post(`${API}/admin/categories`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = (await request.json()) as {
      name?: string
      slug?: string
      description?: string
      iconUrl?: string
      isActive?: boolean
      ordering?: number
    }
    const name = body.name?.trim() ?? ''
    if (!name) return fail(400, 'VALIDATION_ERROR', 'Tên danh mục không được để trống.')
    const slug = body.slug?.trim() ? body.slug.trim().toLowerCase() : slugify(name)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return fail(400, 'INVALID_SLUG', 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.')
    }
    if (db.categories.some((c) => c.slug.toLowerCase() === slug)) {
      return fail(409, 'SLUG_TAKEN', 'Slug danh mục đã tồn tại.')
    }
    const now = new Date().toISOString()
    const created: BeCategory = {
      id: `cat-${crypto.randomUUID()}`,
      name,
      slug,
      description: body.description?.trim() || null,
      iconUrl: body.iconUrl?.trim() || null,
      isActive: body.isActive ?? true,
      ordering: body.ordering ?? 0,
      courseCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    db.categories.push(created)
    persist()
    return ok(toCategoryDto(created), 201)
  }),

  http.put(`${API}/admin/categories/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const cat = db.categories.find((c) => c.id === params.id)
    if (!cat) return fail(404, 'NOT_FOUND', 'Không tìm thấy danh mục.')

    const body = (await request.json()) as {
      name?: string
      slug?: string
      description?: string
      iconUrl?: string
      isActive?: boolean
      ordering?: number
    }
    const name = body.name?.trim() ?? ''
    if (!name) return fail(400, 'VALIDATION_ERROR', 'Tên danh mục không được để trống.')
    const slug = body.slug?.trim() ? body.slug.trim().toLowerCase() : slugify(name)
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return fail(400, 'INVALID_SLUG', 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.')
    }
    if (db.categories.some((c) => c.slug.toLowerCase() === slug && c.id !== cat.id)) {
      return fail(409, 'SLUG_TAKEN', 'Slug danh mục đã tồn tại.')
    }
    cat.name = name
    cat.slug = slug
    cat.description = body.description?.trim() || null
    cat.iconUrl = body.iconUrl?.trim() || null
    if (body.isActive !== undefined) cat.isActive = body.isActive
    if (body.ordering !== undefined) cat.ordering = body.ordering
    cat.updatedAt = new Date().toISOString()
    for (const c of db.moderationCourses) {
      if (c.categoryId === cat.id) c.categoryName = cat.name
    }
    persist()
    return ok(toCategoryDto(cat))
  }),

  http.delete(`${API}/admin/categories/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const idx = db.categories.findIndex((c) => c.id === params.id)
    if (idx === -1) return fail(404, 'NOT_FOUND', 'Không tìm thấy danh mục.')
    const inUse = db.moderationCourses.some((c) => c.categoryId === params.id)
    if (inUse) {
      return fail(
        409,
        'CATEGORY_IN_USE',
        'Không thể xóa danh mục đang có khóa học. Hãy ẩn danh mục thay thế.',
      )
    }
    db.categories.splice(idx, 1)
    persist()
    return ok(null, 204)
  }),

  http.get(`${API}/admin/teachers`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const url = new URL(request.url)
    const status = url.searchParams.get('status') as UserStatus | null
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const page = Number(url.searchParams.get('page') ?? 0) || 0
    const size = Number(url.searchParams.get('size') ?? 10) || 10

    const filtered = db.users
      .filter((u) => u.role === 'TEACHER')
      .filter((u) => !status || u.status === status)
      .filter(
        (u) =>
          !q ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((u) => toTeacherAccount(u))

    return okPage(filtered, page, size)
  }),

  http.post(`${API}/admin/teachers`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = (await request.json()) as {
      username?: string
      email?: string
      fullName?: string
      phone?: string
      bio?: string
      password?: string
    }
    const username = (body.username ?? '').trim().toLowerCase()
    if (!/^[a-z0-9_.]{3,50}$/.test(username)) {
      return fail(400, 'INVALID_USERNAME', 'Tên đăng nhập không hợp lệ.')
    }
    const email = (body.email ?? '').trim().toLowerCase()
    if (db.users.some((u) => u.username === username)) {
      return fail(409, 'USERNAME_TAKEN', 'Tên đăng nhập đã tồn tại.')
    }
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return fail(409, 'EMAIL_TAKEN', 'Email đã tồn tại.')
    }
    const rawPass = body.password?.trim()
    const temporaryPassword = rawPass ? null : 'TempPass1234'
    const now = new Date().toISOString()
    const created: StoredUser = {
      id: `u-${crypto.randomUUID()}`,
      username,
      email,
      fullName: (body.fullName ?? '').trim(),
      password: rawPass || temporaryPassword!,
      avatarUrl: null,
      bio: body.bio?.trim() || null,
      phone: body.phone?.trim() || null,
      role: 'TEACHER',
      status: 'ACTIVE',
      isActive: true,
      emailVerified: false,
      lockReason: null,
      createdAt: now,
      updatedAt: now,
    }
    db.users.push(created)
    persist()
    return ok(toTeacherAccount(created, temporaryPassword), 201)
  }),

  http.get(`${API}/admin/teachers/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const teacher = db.users.find((u) => u.id === params.id && u.role === 'TEACHER')
    if (!teacher) return fail(404, 'NOT_FOUND', 'Không tìm thấy giảng viên.')
    return ok(toTeacherAccount(teacher))
  }),

  http.put(`${API}/admin/teachers/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const teacher = db.users.find((u) => u.id === params.id && u.role === 'TEACHER')
    if (!teacher) return fail(404, 'NOT_FOUND', 'Không tìm thấy giảng viên.')

    const body = (await request.json()) as {
      email?: string
      fullName?: string
      phone?: string
      bio?: string
    }
    const email = (body.email ?? '').trim().toLowerCase()
    const fullName = (body.fullName ?? '').trim()
    if (!email || !fullName) {
      return fail(400, 'VALIDATION_ERROR', 'Vui lòng nhập đầy đủ email và họ tên.')
    }
    if (db.users.some((u) => u.email.toLowerCase() === email && u.id !== teacher.id)) {
      return fail(409, 'EMAIL_TAKEN', 'Email đã được sử dụng bởi tài khoản khác.')
    }
    teacher.email = email
    teacher.fullName = fullName
    teacher.phone = body.phone?.trim() || null
    teacher.bio = body.bio?.trim() || null
    teacher.updatedAt = new Date().toISOString()
    for (const c of db.moderationCourses) {
      if (c.teacherId === teacher.id) c.teacherName = teacher.fullName
    }
    persist()
    return ok(toTeacherAccount(teacher))
  }),

  http.post(`${API}/admin/teachers/:id/reset-password`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const teacher = db.users.find((u) => u.id === params.id && u.role === 'TEACHER')
    if (!teacher) return fail(404, 'NOT_FOUND', 'Không tìm thấy giảng viên.')

    const temporaryPassword = `Reset${Math.floor(1000000 + Math.random() * 9000000)}`
    teacher.password = temporaryPassword
    teacher.updatedAt = new Date().toISOString()
    persist()
    return ok(toTeacherAccount(teacher, temporaryPassword))
  }),

  http.post(`${API}/admin/teachers/:id/approve`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const teacher = db.users.find((u) => u.id === params.id && u.role === 'TEACHER')
    if (!teacher) return fail(404, 'NOT_FOUND', 'Không tìm thấy giảng viên.')
    if (teacher.status !== 'PENDING') {
      return fail(409, 'INVALID_TEACHER_STATUS', 'Chỉ tài khoản PENDING mới có thể phê duyệt.')
    }
    teacher.status = 'ACTIVE'
    teacher.isActive = true
    teacher.lockReason = null
    teacher.updatedAt = new Date().toISOString()
    persist()
    return ok(toTeacherAccount(teacher))
  }),

  http.post(`${API}/admin/teachers/:id/lock`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = (await request.json()) as { reason?: string }
    const reason = body.reason?.trim()
    if (!reason) return fail(400, 'REASON_REQUIRED', 'Vui lòng nhập lý do khóa.')

    const teacher = db.users.find((u) => u.id === params.id && u.role === 'TEACHER')
    if (!teacher) return fail(404, 'NOT_FOUND', 'Không tìm thấy giảng viên.')
    if (teacher.status === 'LOCKED') {
      return fail(409, 'ALREADY_LOCKED', 'Tài khoản đã bị khóa.')
    }
    teacher.status = 'LOCKED'
    teacher.isActive = false
    teacher.lockReason = reason
    teacher.updatedAt = new Date().toISOString()
    persist()
    return ok(toTeacherAccount(teacher))
  }),

  http.post(`${API}/admin/teachers/:id/unlock`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const teacher = db.users.find((u) => u.id === params.id && u.role === 'TEACHER')
    if (!teacher) return fail(404, 'NOT_FOUND', 'Không tìm thấy giảng viên.')
    if (teacher.status !== 'LOCKED') {
      return fail(409, 'INVALID_TEACHER_STATUS', 'Chỉ tài khoản đang khóa mới có thể mở khóa.')
    }
    teacher.status = 'ACTIVE'
    teacher.isActive = true
    teacher.lockReason = null
    teacher.updatedAt = new Date().toISOString()
    persist()
    return ok(toTeacherAccount(teacher))
  }),

  http.get(`${API}/admin/students`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const url = new URL(request.url)
    const status = url.searchParams.get('status') as UserStatus | null
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const page = Number(url.searchParams.get('page') ?? 0) || 0
    const size = Number(url.searchParams.get('size') ?? 10) || 10

    const filtered = db.users
      .filter((u) => u.role === 'STUDENT')
      .filter((u) => !status || u.status === status)
      .filter(
        (u) =>
          !q ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toStudentAccount)

    return okPage(filtered, page, size)
  }),

  http.post(`${API}/admin/students/:id/lock`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = (await request.json()) as { reason?: string }
    const reason = body.reason?.trim()
    if (!reason) return fail(400, 'REASON_REQUIRED', 'Vui lòng nhập lý do khóa.')

    const student = db.users.find((u) => u.id === params.id && u.role === 'STUDENT')
    if (!student) return fail(404, 'NOT_FOUND', 'Không tìm thấy học viên.')
    if (student.status === 'LOCKED') {
      return fail(409, 'ALREADY_LOCKED', 'Tài khoản học viên đã bị khóa.')
    }
    student.status = 'LOCKED'
    student.isActive = false
    student.lockReason = reason
    student.updatedAt = new Date().toISOString()
    persist()
    return ok(toStudentAccount(student))
  }),

  http.post(`${API}/admin/students/:id/unlock`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const student = db.users.find((u) => u.id === params.id && u.role === 'STUDENT')
    if (!student) return fail(404, 'NOT_FOUND', 'Không tìm thấy học viên.')
    if (student.status !== 'LOCKED') {
      return fail(409, 'INVALID_STUDENT_STATUS', 'Chỉ tài khoản đang khóa mới có thể mở khóa.')
    }
    student.status = 'ACTIVE'
    student.isActive = true
    student.lockReason = null
    student.updatedAt = new Date().toISOString()
    persist()
    return ok(toStudentAccount(student))
  }),

  http.get(`${API}/admin/reviews/courses`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const url = new URL(request.url)
    const status = (url.searchParams.get('status') as ContentStatus | null) ?? 'PENDING_REVIEW'
    const page = Number(url.searchParams.get('page') ?? 0) || 0
    const size = Number(url.searchParams.get('size') ?? 10) || 10

    const items = db.moderationCourses
      .filter((c) => c.status === status)
      .sort((a, b) => (a.submittedAt ?? a.createdAt).localeCompare(b.submittedAt ?? b.createdAt))
      .map(toCourseReviewItem)

    return okPage(items, page, size)
  }),

  http.get(`${API}/admin/reviews/lessons`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const url = new URL(request.url)
    const status = (url.searchParams.get('status') as ContentStatus | null) ?? 'PENDING_REVIEW'
    const page = Number(url.searchParams.get('page') ?? 0) || 0
    const size = Number(url.searchParams.get('size') ?? 10) || 10

    const items: BeReviewQueueItem[] = []
    for (const c of db.moderationCourses) {
      if (c.status !== 'APPROVED') continue
      for (const s of c.sections) {
        for (const l of s.lessons) {
          if (l.status !== status) continue
          items.push({
            id: l.id,
            title: l.title,
            teacherName: c.teacherName,
            skillFocus: c.skillFocus ?? null,
            status: l.status,
            submittedAt: l.submittedAt ?? null,
            waitingDays: waitingDays(l.submittedAt),
            reviewedAt: l.reviewedAt ?? null,
            reviewNote: l.reviewNote ?? null,
            courseId: c.id,
            courseTitle: c.title,
            sectionId: s.id,
            sectionTitle: s.title,
            lessonType: l.lessonType,
          })
        }
      }
    }
    return okPage(items, page, size)
  }),

  http.get(`${API}/admin/courses`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const url = new URL(request.url)
    const status = url.searchParams.get('status') as ContentStatus | null
    const rawActive = url.searchParams.get('isActive')
    const filterActive = rawActive === null || rawActive === '' ? undefined : rawActive === 'true'
    const skill = url.searchParams.get('skill') as SkillType | null
    const categoryId = url.searchParams.get('categoryId') ?? ''
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const page = Number(url.searchParams.get('page') ?? 0) || 0
    const size = Number(url.searchParams.get('size') ?? 10) || 10

    const filtered = db.moderationCourses
      .filter((c) => !status || c.status === status)
      .filter((c) => filterActive === undefined || c.isActive === filterActive)
      .filter((c) => !skill || c.skillFocus === skill)
      .filter((c) => !categoryId || c.categoryId === categoryId)
      .filter(
        (c) =>
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.teacherName.toLowerCase().includes(q),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toAdminCourseSummary)

    return okPage(filtered, page, size)
  }),

  http.patch(`${API}/admin/courses/:id/featured`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')

    const body = (await request.json()) as { featured?: boolean }
    const featured = Boolean(body.featured)
    if (featured && (course.status !== 'APPROVED' || !course.isActive)) {
      return fail(
        409,
        'COURSE_NOT_ELIGIBLE_FOR_FEATURED',
        'Chỉ khóa học đã duyệt và đang hiển thị mới có thể gắn nổi bật.',
      )
    }
    course.isFeatured = featured
    course.updatedAt = new Date().toISOString()
    persist()
    return ok(toAdminCourseSummary(course))
  }),

  http.post(`${API}/admin/courses/:id/deactivate`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = (await request.json().catch(() => ({}))) as { reason?: string }
    const reason = body.reason?.trim()
    if (!reason) return fail(400, 'REASON_REQUIRED', 'Vui lòng nhập lý do tạm ẩn.')

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (!course.isActive) {
      return fail(409, 'COURSE_ALREADY_INACTIVE', 'Khóa học hiện đã bị ẩn.')
    }
    course.isActive = false
    course.isFeatured = false
    course.deactivationReason = reason
    course.updatedAt = new Date().toISOString()
    persist()
    return ok(toAdminCourseSummary(course))
  }),

  http.post(`${API}/admin/courses/:id/activate`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.isActive) {
      return fail(409, 'COURSE_ALREADY_ACTIVE', 'Khóa học hiện đang hiển thị.')
    }
    course.isActive = true
    course.deactivationReason = null
    course.updatedAt = new Date().toISOString()
    persist()
    return ok(toAdminCourseSummary(course))
  }),

  http.get(`${API}/admin/courses/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    return course ? ok(course) : fail(404, 'NOT_FOUND', 'Course not found')
  }),

  http.post(`${API}/admin/courses/:id/approve`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.status !== 'PENDING_REVIEW') {
      return fail(409, 'INVALID_REVIEW_STATUS', 'Chỉ khóa học đang chờ duyệt mới có thể phê duyệt.')
    }
    const body = (await request.json().catch(() => ({}))) as { note?: string }
    const now = new Date().toISOString()
    course.status = 'APPROVED'
    course.publishedAt = course.publishedAt ?? now
    course.reviewedAt = now
    course.reviewedById = user.id
    course.reviewedByName = user.fullName
    course.reviewNote = body.note?.trim() || null
    for (const s of course.sections) {
      for (const l of s.lessons) {
        if (l.status === 'PENDING_REVIEW') {
          l.status = 'APPROVED'
          l.reviewedAt = now
          l.reviewNote = course.reviewNote
        }
      }
    }
    persist()
    return ok(course)
  }),

  http.post(`${API}/admin/courses/:id/reject`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = (await request.json().catch(() => ({}))) as { reason?: string }
    const reason = body.reason?.trim()
    if (!reason) return fail(400, 'REASON_REQUIRED', 'Vui lòng nhập lý do từ chối.')

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.status !== 'PENDING_REVIEW') {
      return fail(409, 'INVALID_REVIEW_STATUS', 'Chỉ khóa học đang chờ duyệt mới có thể từ chối.')
    }
    const now = new Date().toISOString()
    course.status = 'REJECTED'
    course.reviewedAt = now
    course.reviewedById = user.id
    course.reviewedByName = user.fullName
    course.reviewNote = reason
    for (const s of course.sections) {
      for (const l of s.lessons) {
        if (l.status === 'PENDING_REVIEW') {
          l.status = 'REJECTED'
          l.reviewedAt = now
          l.reviewNote = reason
        }
      }
    }
    persist()
    return ok(course)
  }),

  http.post(`${API}/admin/lessons/:id/approve`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = (await request.json().catch(() => ({}))) as { note?: string }
    for (const c of db.moderationCourses) {
      for (const s of c.sections) {
        const lesson = s.lessons.find((l) => l.id === params.id)
        if (!lesson) continue
        if (c.status !== 'APPROVED') {
          return fail(409, 'COURSE_NOT_APPROVED', 'Hãy duyệt khóa học thay vì duyệt bài học lẻ.')
        }
        if (lesson.status !== 'PENDING_REVIEW') {
          return fail(409, 'INVALID_REVIEW_STATUS', 'Chỉ bài học đang chờ duyệt mới có thể phê duyệt.')
        }
        const now = new Date().toISOString()
        lesson.status = 'APPROVED'
        lesson.reviewedAt = now
        lesson.reviewNote = body.note?.trim() || null
        persist()
        return ok({
          id: lesson.id,
          title: lesson.title,
          teacherName: c.teacherName,
          skillFocus: c.skillFocus ?? null,
          status: lesson.status,
          submittedAt: lesson.submittedAt ?? null,
          waitingDays: waitingDays(lesson.submittedAt),
          reviewedAt: lesson.reviewedAt,
          reviewNote: lesson.reviewNote,
          courseId: c.id,
          courseTitle: c.title,
          sectionId: s.id,
          sectionTitle: s.title,
          lessonType: lesson.lessonType,
        } satisfies BeReviewQueueItem)
      }
    }
    return fail(404, 'NOT_FOUND', 'Lesson not found')
  }),

  http.post(`${API}/admin/lessons/:id/reject`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = (await request.json().catch(() => ({}))) as { reason?: string }
    const reason = body.reason?.trim()
    if (!reason) return fail(400, 'REASON_REQUIRED', 'Vui lòng nhập lý do từ chối.')

    for (const c of db.moderationCourses) {
      for (const s of c.sections) {
        const lesson = s.lessons.find((l) => l.id === params.id)
        if (!lesson) continue
        if (c.status !== 'APPROVED') {
          return fail(409, 'COURSE_NOT_APPROVED', 'Hãy duyệt khóa học thay vì xử lý bài học lẻ.')
        }
        if (lesson.status !== 'PENDING_REVIEW') {
          return fail(409, 'INVALID_REVIEW_STATUS', 'Chỉ bài học đang chờ duyệt mới có thể từ chối.')
        }
        const now = new Date().toISOString()
        lesson.status = 'REJECTED'
        lesson.reviewedAt = now
        lesson.reviewNote = reason
        persist()
        return ok({
          id: lesson.id,
          title: lesson.title,
          teacherName: c.teacherName,
          skillFocus: c.skillFocus ?? null,
          status: lesson.status,
          submittedAt: lesson.submittedAt ?? null,
          waitingDays: waitingDays(lesson.submittedAt),
          reviewedAt: lesson.reviewedAt,
          reviewNote: lesson.reviewNote,
          courseId: c.id,
          courseTitle: c.title,
          sectionId: s.id,
          sectionTitle: s.title,
          lessonType: lesson.lessonType,
        } satisfies BeReviewQueueItem)
      }
    }
    return fail(404, 'NOT_FOUND', 'Lesson not found')
  }),

  // ---------------------------------------------------------------- teacher
  http.get(`${API}/teacher/courses`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const url = new URL(request.url)
    const status = url.searchParams.get('status') as ContentStatus | null
    const page = Number(url.searchParams.get('page') ?? 0) || 0
    const size = Number(url.searchParams.get('size') ?? 10) || 10

    const items = db.moderationCourses
      .filter((c) => c.teacherId === user.id)
      .filter((c) => !status || c.status === status)
      .map(toTeacherCourseSummary)

    return okPage(items, page, size)
  }),

  http.get(`${API}/teacher/courses/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.teacherId !== user.id) return forbidden()
    return ok(withLessonExerciseCounts(course))
  }),

  http.post(`${API}/teacher/courses`, async ({ request }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const body = (await request.json()) as {
      categoryId?: string
      title?: string
      description?: string
      thumbnail?: string
      skillFocus?: SkillType
      difficultyLevel?: DifficultyLevel
      estimatedDuration?: number
      maxStudents?: number | null
      startDate?: string | null
      endDate?: string | null
    }
    const title = body.title?.trim() ?? ''
    if (!title || !body.categoryId || !body.skillFocus || !body.difficultyLevel) {
      return fail(400, 'VALIDATION_ERROR', 'Vui lòng nhập đầy đủ thông tin bắt buộc.')
    }
    if (
      body.startDate &&
      body.endDate &&
      new Date(body.endDate).getTime() <= new Date(body.startDate).getTime()
    ) {
      return fail(400, 'INVALID_DATE_RANGE', 'Thời gian kết thúc phải sau thời gian bắt đầu')
    }
    const category = db.categories.find((c) => c.id === body.categoryId)
    if (!category) return fail(404, 'NOT_FOUND', 'Không tìm thấy danh mục.')
    if (!category.isActive) return fail(400, 'CATEGORY_INACTIVE', 'Danh mục đã bị ẩn.')

    const now = new Date().toISOString()
    const created: BeAdminCourseDetail = {
      id: `mc-${crypto.randomUUID()}`,
      title,
      description: body.description?.trim() || null,
      thumbnail: body.thumbnail?.trim() || null,
      teacherId: user.id,
      teacherName: user.fullName,
      categoryId: category.id,
      categoryName: category.name,
      skillFocus: body.skillFocus,
      difficultyLevel: body.difficultyLevel,
      estimatedDuration: body.estimatedDuration ?? null,
      maxStudents: body.maxStudents ?? null,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      enrollmentCount: 0,
      isFeatured: false,
      isActive: true,
      publishedAt: null,
      status: 'DRAFT',
      submittedAt: null,
      reviewedAt: null,
      reviewedById: null,
      reviewedByName: null,
      reviewNote: null,
      deactivationReason: null,
      createdAt: now,
      updatedAt: now,
      totalLessons: 0,
      sections: [],
    }
    db.moderationCourses.unshift(created)
    persist()
    return ok(created, 201)
  }),

  http.put(`${API}/teacher/courses/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.teacherId !== user.id) return forbidden()
    if (course.status === 'PENDING_REVIEW') {
      return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể sửa khóa học đang chờ duyệt. Hãy rút duyệt trước.')
    }

    const body = (await request.json()) as {
      categoryId?: string
      title?: string
      description?: string
      thumbnail?: string
      skillFocus?: SkillType
      difficultyLevel?: DifficultyLevel
      estimatedDuration?: number
      maxStudents?: number | null
      startDate?: string | null
      endDate?: string | null
    }
    const title = body.title?.trim() ?? ''
    if (!title || !body.categoryId || !body.skillFocus || !body.difficultyLevel) {
      return fail(400, 'VALIDATION_ERROR', 'Vui lòng nhập đầy đủ thông tin bắt buộc.')
    }
    if (
      body.startDate &&
      body.endDate &&
      new Date(body.endDate).getTime() <= new Date(body.startDate).getTime()
    ) {
      return fail(400, 'INVALID_DATE_RANGE', 'Thời gian kết thúc phải sau thời gian bắt đầu')
    }
    const activeEnrolled = activeEnrollmentCountForCourse(course.id)
    if (body.maxStudents !== null && body.maxStudents !== undefined && body.maxStudents < activeEnrolled) {
      return fail(
        409,
        'MAX_STUDENTS_BELOW_ENROLLED',
        `Số học viên tối đa không thể nhỏ hơn số học viên đang theo học (${activeEnrolled})`,
      )
    }
    const category = db.categories.find((c) => c.id === body.categoryId)
    if (!category) return fail(404, 'NOT_FOUND', 'Không tìm thấy danh mục.')
    if (body.categoryId !== course.categoryId && !category.isActive) {
      return fail(400, 'CATEGORY_INACTIVE', 'Danh mục đã bị ẩn.')
    }

    course.categoryId = category.id
    course.categoryName = category.name
    course.title = title
    course.description = body.description?.trim() || null
    course.thumbnail = body.thumbnail?.trim() || null
    course.skillFocus = body.skillFocus
    course.difficultyLevel = body.difficultyLevel
    course.estimatedDuration = body.estimatedDuration ?? null
    course.maxStudents = body.maxStudents ?? null
    course.startDate = body.startDate ?? null
    course.endDate = body.endDate ?? null
    course.updatedAt = new Date().toISOString()
    persist()
    return ok(withLessonExerciseCounts(course))
  }),

  http.delete(`${API}/teacher/courses/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const idx = db.moderationCourses.findIndex((c) => c.id === params.id)
    if (idx === -1) return fail(404, 'NOT_FOUND', 'Course not found')
    const course = db.moderationCourses[idx]
    if (course.teacherId !== user.id) return forbidden()
    if ((course.status !== 'DRAFT' && course.status !== 'REJECTED') || course.publishedAt) {
      return fail(
        409,
        'COURSE_NOT_DELETABLE',
        'Chỉ khóa học Bản nháp hoặc Bị từ chối chưa từng xuất bản mới được xóa.',
      )
    }
    db.moderationCourses.splice(idx, 1)
    persist()
    return ok(null, 204)
  }),

  http.post(`${API}/teacher/courses/:id/submit`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.teacherId !== user.id) return forbidden()
    if (!course.isActive) {
      return fail(409, 'COURSE_INACTIVE', 'Khóa học đang tạm ẩn không thể gửi duyệt.')
    }
    if (course.status !== 'DRAFT' && course.status !== 'REJECTED') {
      return fail(409, 'INVALID_SUBMIT_STATUS', 'Chỉ khóa học Bản nháp hoặc Bị từ chối mới có thể gửi duyệt.')
    }
    const lessonCount = course.sections.reduce((n, s) => n + s.lessons.length, 0)
    if (lessonCount === 0) {
      return fail(400, 'EMPTY_COURSE', 'Khóa học cần có ít nhất 1 bài học trước khi gửi duyệt.')
    }
    const now = new Date().toISOString()
    course.status = 'PENDING_REVIEW'
    course.submittedAt = now
    course.reviewedAt = null
    course.reviewedById = null
    course.reviewedByName = null
    course.reviewNote = null
    for (const s of course.sections) {
      for (const l of s.lessons) {
        if (l.status === 'DRAFT' || l.status === 'REJECTED') {
          l.status = 'PENDING_REVIEW'
          l.submittedAt = now
          l.reviewedAt = null
          l.reviewNote = null
        }
      }
    }
    persist()
    return ok(course)
  }),

  http.post(`${API}/teacher/courses/:id/withdraw`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.teacherId !== user.id) return forbidden()
    if (course.status !== 'PENDING_REVIEW') {
      return fail(409, 'INVALID_WITHDRAW_STATUS', 'Chỉ khóa học đang chờ duyệt mới có thể rút duyệt.')
    }
    course.status = 'DRAFT'
    course.submittedAt = null
    course.reviewedAt = null
    course.reviewedById = null
    course.reviewedByName = null
    course.reviewNote = null
    for (const s of course.sections) {
      for (const l of s.lessons) {
        if (l.status === 'PENDING_REVIEW') {
          l.status = 'DRAFT'
          l.submittedAt = null
          l.reviewedAt = null
          l.reviewNote = null
        }
      }
    }
    course.updatedAt = new Date().toISOString()
    persist()
    return ok(course)
  }),

  http.post(`${API}/teacher/courses/:id/archive`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.teacherId !== user.id) return forbidden()
    if (course.status === 'PENDING_REVIEW') {
      return fail(409, 'COURSE_PENDING_REVIEW', 'Hãy rút duyệt khóa học trước khi lưu trữ.')
    }
    if (!course.isActive) {
      return fail(409, 'COURSE_ALREADY_INACTIVE', 'Khóa học hiện đã được lưu trữ hoặc đang ẩn.')
    }
    course.isActive = false
    course.isFeatured = false
    course.updatedAt = new Date().toISOString()
    persist()
    return ok(course)
  }),

  http.post(`${API}/teacher/courses/:courseId/sections`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.courseId)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.teacherId !== user.id) return forbidden()
    if (course.status === 'PENDING_REVIEW') {
      return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể thêm chương khi khóa học đang chờ duyệt.')
    }

    const body = (await request.json()) as { title?: string; description?: string; ordering?: number }
    const title = body.title?.trim() ?? ''
    if (!title) return fail(400, 'VALIDATION_ERROR', 'Tên chương không được để trống.')
    const maxOrder = course.sections.reduce((m, s) => Math.max(m, s.ordering), 0)
    const section: BeAdminSection = {
      id: `ms-${crypto.randomUUID()}`,
      title,
      description: body.description?.trim() || null,
      ordering: body.ordering ?? maxOrder + 1,
      lessons: [],
    }
    course.sections.push(section)
    course.sections.sort((a, b) => a.ordering - b.ordering)
    course.updatedAt = new Date().toISOString()
    persist()
    return ok(section, 201)
  }),

  http.put(`${API}/teacher/sections/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const body = (await request.json()) as { title?: string; description?: string; ordering?: number }
    const title = body.title?.trim() ?? ''
    if (!title) return fail(400, 'VALIDATION_ERROR', 'Tên chương không được để trống.')

    for (const c of db.moderationCourses) {
      const section = c.sections.find((s) => s.id === params.id)
      if (!section) continue
      if (c.teacherId !== user.id) return forbidden()
      if (c.status === 'PENDING_REVIEW') {
        return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể sửa chương khi khóa học đang chờ duyệt.')
      }
      section.title = title
      section.description = body.description?.trim() || null
      if (body.ordering !== undefined) section.ordering = body.ordering
      c.sections.sort((a, b) => a.ordering - b.ordering)
      c.updatedAt = new Date().toISOString()
      persist()
      return ok(section)
    }
    return fail(404, 'NOT_FOUND', 'Section not found')
  }),

  http.delete(`${API}/teacher/sections/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    for (const c of db.moderationCourses) {
      const idx = c.sections.findIndex((s) => s.id === params.id)
      if (idx === -1) continue
      if (c.teacherId !== user.id) return forbidden()
      if (c.status === 'PENDING_REVIEW') {
        return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể xóa chương khi khóa học đang chờ duyệt.')
      }
      const section = c.sections[idx]
      if (section.lessons.some((l) => l.status === 'APPROVED' || l.status === 'PENDING_REVIEW')) {
        return fail(
          409,
          'SECTION_HAS_PROTECTED_LESSONS',
          'Không thể xóa chương đang chứa bài học Đã duyệt hoặc Chờ duyệt.',
        )
      }
      c.sections.splice(idx, 1)
      c.totalLessons = c.sections.reduce((n, s) => n + s.lessons.length, 0)
      c.updatedAt = new Date().toISOString()
      persist()
      return ok(null, 204)
    }
    return fail(404, 'NOT_FOUND', 'Section not found')
  }),

  http.post(`${API}/teacher/sections/:sectionId/lessons`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const body = (await request.json()) as {
      title?: string
      lessonType?: string
      videoUrl?: string
      videoDuration?: number
      documentUrl?: string
      ordering?: number
      isPreview?: boolean
    }
    const title = body.title?.trim() ?? ''
    if (!title) return fail(400, 'VALIDATION_ERROR', 'Tên bài học không được để trống.')

    for (const c of db.moderationCourses) {
      const section = c.sections.find((s) => s.id === params.sectionId)
      if (!section) continue
      if (c.teacherId !== user.id) return forbidden()
      if (c.status === 'PENDING_REVIEW') {
        return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể thêm bài học khi khóa học đang chờ duyệt.')
      }
      const maxOrder = section.lessons.reduce((m, l) => Math.max(m, l.ordering), 0)
      const lesson: BeAdminLesson = {
        id: `ml-${crypto.randomUUID()}`,
        sectionId: section.id,
        title,
        lessonType: (body.lessonType ?? 'VIDEO').toUpperCase(),
        videoUrl: body.videoUrl?.trim() || null,
        videoDuration: body.videoDuration ?? null,
        documentUrl: body.documentUrl?.trim() || null,
        ordering: body.ordering ?? maxOrder + 1,
        isPreview: Boolean(body.isPreview),
        status: 'DRAFT',
        submittedAt: null,
        reviewedAt: null,
        reviewNote: null,
      }
      section.lessons.push(lesson)
      section.lessons.sort((a, b) => a.ordering - b.ordering)
      c.totalLessons = c.sections.reduce((n, s) => n + s.lessons.length, 0)
      c.updatedAt = new Date().toISOString()
      persist()
      return ok(lesson, 201)
    }
    return fail(404, 'NOT_FOUND', 'Section not found')
  }),

  http.put(`${API}/teacher/lessons/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const body = (await request.json()) as {
      title?: string
      lessonType?: string
      videoUrl?: string
      videoDuration?: number
      documentUrl?: string
      ordering?: number
      isPreview?: boolean
    }
    const title = body.title?.trim() ?? ''
    if (!title) return fail(400, 'VALIDATION_ERROR', 'Tên bài học không được để trống.')

    for (const c of db.moderationCourses) {
      for (const s of c.sections) {
        const lesson = s.lessons.find((l) => l.id === params.id)
        if (!lesson) continue
        if (c.teacherId !== user.id) return forbidden()
        if (c.status === 'PENDING_REVIEW') {
          return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể sửa bài học khi khóa học đang chờ duyệt.')
        }
        if (lesson.status === 'PENDING_REVIEW') {
          return fail(409, 'LESSON_PENDING_REVIEW', 'Không thể sửa bài học đang chờ duyệt. Hãy rút duyệt trước.')
        }
        lesson.title = title
        lesson.lessonType = (body.lessonType ?? 'VIDEO').toUpperCase()
        lesson.videoUrl = body.videoUrl?.trim() || null
        lesson.videoDuration = body.videoDuration ?? null
        lesson.documentUrl = body.documentUrl?.trim() || null
        if (body.ordering !== undefined) lesson.ordering = body.ordering
        if (body.isPreview !== undefined) lesson.isPreview = body.isPreview
        if (lesson.status === 'APPROVED') {
          lesson.status = 'DRAFT'
          lesson.submittedAt = null
          lesson.reviewedAt = null
          lesson.reviewNote = null
        }
        s.lessons.sort((a, b) => a.ordering - b.ordering)
        c.updatedAt = new Date().toISOString()
        persist()
        return ok(lesson)
      }
    }
    return fail(404, 'NOT_FOUND', 'Lesson not found')
  }),

  http.delete(`${API}/teacher/lessons/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    for (const c of db.moderationCourses) {
      for (const s of c.sections) {
        const idx = s.lessons.findIndex((l) => l.id === params.id)
        if (idx === -1) continue
        if (c.teacherId !== user.id) return forbidden()
        if (c.status === 'PENDING_REVIEW') {
          return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể xóa bài học khi khóa học đang chờ duyệt.')
        }
        const lesson = s.lessons[idx]
        if (lesson.status !== 'DRAFT' && lesson.status !== 'REJECTED') {
          return fail(409, 'LESSON_NOT_DELETABLE', 'Chỉ bài học Bản nháp hoặc Bị từ chối mới được xóa.')
        }
        s.lessons.splice(idx, 1)
        c.totalLessons = c.sections.reduce((n, sec) => n + sec.lessons.length, 0)
        c.updatedAt = new Date().toISOString()
        persist()
        return ok(null, 204)
      }
    }
    return fail(404, 'NOT_FOUND', 'Lesson not found')
  }),

  http.post(`${API}/teacher/lessons/:id/submit`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    for (const c of db.moderationCourses) {
      for (const s of c.sections) {
        const lesson = s.lessons.find((l) => l.id === params.id)
        if (!lesson) continue
        if (c.teacherId !== user.id) return forbidden()
        if (c.status !== 'APPROVED') {
          return fail(409, 'COURSE_NOT_APPROVED', 'Hãy gửi duyệt toàn bộ khóa học.')
        }
        if (lesson.status !== 'DRAFT' && lesson.status !== 'REJECTED') {
          return fail(409, 'INVALID_SUBMIT_STATUS', 'Chỉ bài học Bản nháp hoặc Bị từ chối mới có thể gửi duyệt.')
        }
        const now = new Date().toISOString()
        lesson.status = 'PENDING_REVIEW'
        lesson.submittedAt = now
        lesson.reviewedAt = null
        lesson.reviewNote = null
        persist()
        return ok({
          id: lesson.id,
          title: lesson.title,
          teacherName: c.teacherName,
          skillFocus: c.skillFocus ?? null,
          status: lesson.status,
          submittedAt: lesson.submittedAt,
          waitingDays: 0,
          reviewedAt: null,
          reviewNote: null,
          courseId: c.id,
          courseTitle: c.title,
          sectionId: s.id,
          sectionTitle: s.title,
          lessonType: lesson.lessonType,
        } satisfies BeReviewQueueItem)
      }
    }
    return fail(404, 'NOT_FOUND', 'Lesson not found')
  }),

  http.post(`${API}/teacher/lessons/:id/withdraw`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    for (const c of db.moderationCourses) {
      for (const s of c.sections) {
        const lesson = s.lessons.find((l) => l.id === params.id)
        if (!lesson) continue
        if (c.teacherId !== user.id) return forbidden()
        if (c.status !== 'APPROVED') {
          return fail(409, 'COURSE_NOT_APPROVED', 'Hãy rút duyệt toàn bộ khóa học.')
        }
        if (lesson.status !== 'PENDING_REVIEW') {
          return fail(409, 'INVALID_WITHDRAW_STATUS', 'Chỉ bài học đang chờ duyệt mới có thể rút duyệt.')
        }
        lesson.status = 'DRAFT'
        lesson.submittedAt = null
        lesson.reviewedAt = null
        lesson.reviewNote = null
        persist()
        return ok({
          id: lesson.id,
          title: lesson.title,
          teacherName: c.teacherName,
          skillFocus: c.skillFocus ?? null,
          status: lesson.status,
          submittedAt: null,
          waitingDays: 0,
          reviewedAt: null,
          reviewNote: null,
          courseId: c.id,
          courseTitle: c.title,
          sectionId: s.id,
          sectionTitle: s.title,
          lessonType: lesson.lessonType,
        } satisfies BeReviewQueueItem)
      }
    }
    return fail(404, 'NOT_FOUND', 'Lesson not found')
  }),

  http.get(`${API}/teacher/lessons/:lessonId/exercises`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const ctx = findTeacherLessonContext(String(params.lessonId))
    if (!ctx) return fail(404, 'NOT_FOUND', 'Lesson not found')
    if (ctx.course.teacherId !== user.id) return forbidden()

    const exercises = db.teacherExercises
      .filter((e) => e.lessonId === ctx.lesson.id)
      .sort((a, b) => a.ordering - b.ordering)
      .map(toTeacherExerciseSummary)

    return ok({
      lessonId: ctx.lesson.id,
      lessonTitle: ctx.lesson.title,
      lessonStatus: ctx.lesson.status,
      sectionId: ctx.section.id,
      sectionTitle: ctx.section.title,
      courseId: ctx.course.id,
      courseTitle: ctx.course.title,
      courseStatus: ctx.course.status,
      courseSkillFocus: ctx.course.skillFocus ?? null,
      exercises,
    } satisfies BeTeacherLessonExercises)
  }),

  http.post(`${API}/teacher/lessons/:lessonId/exercises`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const ctx = findTeacherLessonContext(String(params.lessonId))
    if (!ctx) return fail(404, 'NOT_FOUND', 'Lesson not found')
    if (ctx.course.teacherId !== user.id) return forbidden()
    if (ctx.course.status === 'PENDING_REVIEW') {
      return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể thêm bài tập khi khóa học đang chờ duyệt.')
    }
    if (ctx.lesson.status === 'PENDING_REVIEW') {
      return fail(409, 'LESSON_PENDING_REVIEW', 'Không thể thêm bài tập khi bài học đang chờ duyệt.')
    }

    const body = (await request.json()) as {
      title?: string
      instruction?: string
      audioUrl?: string
      content?: Record<string, unknown>
      exerciseType?: ExerciseType
      skillType?: SkillType
      timeLimit?: number
      maxAttempts?: number
      passingScore?: number
      ordering?: number
    }
    const title = body.title?.trim() ?? ''
    if (!title || !body.exerciseType || !body.skillType) {
      return fail(400, 'VALIDATION_ERROR', 'Vui lòng nhập đầy đủ tiêu đề, loại và kỹ năng bài tập.')
    }
    const existing = db.teacherExercises.filter((e) => e.lessonId === ctx.lesson.id)
    const maxOrder = existing.reduce((m, e) => Math.max(m, e.ordering), 0)
    const now = new Date().toISOString()
    const created: BeTeacherExerciseDetail = {
      id: `tex-${crypto.randomUUID()}`,
      lessonId: ctx.lesson.id,
      lessonTitle: ctx.lesson.title,
      lessonStatus: ctx.lesson.status,
      sectionId: ctx.section.id,
      sectionTitle: ctx.section.title,
      courseId: ctx.course.id,
      courseTitle: ctx.course.title,
      courseStatus: ctx.course.status,
      title,
      instruction: body.instruction?.trim() || null,
      audioUrl: body.audioUrl?.trim() || null,
      content: body.content ?? null,
      exerciseType: body.exerciseType,
      skillType: body.skillType,
      timeLimit: body.timeLimit ?? null,
      maxAttempts: body.maxAttempts ?? 1,
      passingScore: body.passingScore ?? 0,
      ordering: body.ordering ?? maxOrder + 1,
      submissionCount: 0,
      totalQuestions: 0,
      questionGroups: [],
      createdAt: now,
      updatedAt: now,
    }
    db.teacherExercises.push(created)
    persist()
    return ok(created, 201)
  }),

  http.get(`${API}/teacher/exercises/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const ex = db.teacherExercises.find((e) => e.id === params.id)
    if (!ex) return fail(404, 'NOT_FOUND', 'Exercise not found')
    const ctx = findTeacherLessonContext(ex.lessonId)
    if (!ctx || ctx.course.teacherId !== user.id) return forbidden()
    return ok({
      ...ex,
      lessonTitle: ctx.lesson.title,
      lessonStatus: ctx.lesson.status,
      sectionTitle: ctx.section.title,
      courseTitle: ctx.course.title,
      courseStatus: ctx.course.status,
    })
  }),

  http.put(`${API}/teacher/exercises/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const ex = db.teacherExercises.find((e) => e.id === params.id)
    if (!ex) return fail(404, 'NOT_FOUND', 'Exercise not found')
    const ctx = findTeacherLessonContext(ex.lessonId)
    if (!ctx || ctx.course.teacherId !== user.id) return forbidden()
    if (ctx.course.status === 'PENDING_REVIEW') {
      return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể sửa bài tập khi khóa học đang chờ duyệt.')
    }
    if (ctx.lesson.status === 'PENDING_REVIEW') {
      return fail(409, 'LESSON_PENDING_REVIEW', 'Không thể sửa bài tập khi bài học đang chờ duyệt.')
    }

    const body = (await request.json()) as {
      title?: string
      instruction?: string
      audioUrl?: string
      content?: Record<string, unknown>
      exerciseType?: ExerciseType
      skillType?: SkillType
      timeLimit?: number
      maxAttempts?: number
      passingScore?: number
      ordering?: number
    }
    const title = body.title?.trim() ?? ''
    if (!title || !body.exerciseType || !body.skillType) {
      return fail(400, 'VALIDATION_ERROR', 'Vui lòng nhập đầy đủ thông tin bài tập.')
    }
    if (ex.submissionCount > 0 && (body.exerciseType !== ex.exerciseType || body.skillType !== ex.skillType)) {
      return fail(409, 'EXERCISE_HAS_SUBMISSIONS', 'Không thể đổi kỹ năng hoặc loại bài tập khi đã có bài nộp.')
    }
    ex.title = title
    ex.instruction = body.instruction?.trim() || null
    ex.audioUrl = body.audioUrl?.trim() || null
    if (body.content !== undefined) {
      ex.content = body.content
    }
    ex.timeLimit = body.timeLimit ?? null
    ex.maxAttempts = body.maxAttempts ?? 1
    ex.passingScore = body.passingScore ?? 0
    if (body.ordering !== undefined) ex.ordering = body.ordering
    if (ex.submissionCount === 0) {
      ex.exerciseType = body.exerciseType
      ex.skillType = body.skillType
    }
    ex.updatedAt = new Date().toISOString()
    persist()
    return ok(ex)
  }),

  http.delete(`${API}/teacher/exercises/:id`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const idx = db.teacherExercises.findIndex((e) => e.id === params.id)
    if (idx === -1) return fail(404, 'NOT_FOUND', 'Exercise not found')
    const ex = db.teacherExercises[idx]
    const ctx = findTeacherLessonContext(ex.lessonId)
    if (!ctx || ctx.course.teacherId !== user.id) return forbidden()
    if (ctx.course.status === 'PENDING_REVIEW') {
      return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể xóa bài tập khi khóa học đang chờ duyệt.')
    }
    if (ctx.lesson.status === 'PENDING_REVIEW') {
      return fail(409, 'LESSON_PENDING_REVIEW', 'Không thể xóa bài tập khi bài học đang chờ duyệt.')
    }
    if (ex.submissionCount > 0) {
      return fail(409, 'EXERCISE_HAS_SUBMISSIONS', 'Không thể xóa bài tập đã có học viên nộp bài.')
    }
    db.teacherExercises.splice(idx, 1)
    persist()
    return ok(null, 204)
  }),

  http.put(`${API}/teacher/exercises/:id/questions`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const ex = db.teacherExercises.find((e) => e.id === params.id)
    if (!ex) return fail(404, 'NOT_FOUND', 'Exercise not found')
    const ctx = findTeacherLessonContext(ex.lessonId)
    if (!ctx || ctx.course.teacherId !== user.id) return forbidden()
    if (ctx.course.status === 'PENDING_REVIEW') {
      return fail(409, 'COURSE_PENDING_REVIEW', 'Không thể sửa câu hỏi khi khóa học đang chờ duyệt.')
    }
    if (ctx.lesson.status === 'PENDING_REVIEW') {
      return fail(409, 'LESSON_PENDING_REVIEW', 'Không thể sửa câu hỏi khi bài học đang chờ duyệt.')
    }
    if (ex.submissionCount > 0) {
      return fail(409, 'EXERCISE_HAS_SUBMISSIONS', 'Không thể sửa bộ câu hỏi khi đã có học viên nộp bài.')
    }

    const body = (await request.json()) as {
      questionGroups?: Array<{
        groupTitle?: string
        groupInstruction?: string
        passageReference?: string
        imageUrl?: string
        questionType?: QuestionType
        questionRange?: string
        ordering?: number
        questions: Array<{
          questionText: string
          questionType: QuestionType
          explanation?: string
          points: number
          ordering?: number
          options: Array<{ optionText: string; isCorrect: boolean; point?: number; ordering?: number }>
        }>
      }>
    }
    const groups = body.questionGroups ?? []
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      if (!g.questions?.length) {
        return fail(400, 'EMPTY_QUESTION_GROUP', `Nhóm câu hỏi #${gi + 1} phải có ít nhất 1 câu hỏi.`)
      }
      for (let qi = 0; qi < g.questions.length; qi++) {
        const q = g.questions[qi]
        if (!q.questionText?.trim()) {
          return fail(400, 'VALIDATION_ERROR', `Nội dung câu hỏi #${qi + 1} không được trống.`)
        }
        const opts = q.options ?? []
        if (MOCK_OBJECTIVE_TYPES.has(q.questionType)) {
          if (opts.length < 2) {
            return fail(400, 'MIN_OPTIONS_REQUIRED', `Câu #${qi + 1} cần ít nhất 2 phương án.`)
          }
          if (!opts.some((o) => o.isCorrect)) {
            return fail(400, 'CORRECT_OPTION_REQUIRED', `Câu #${qi + 1} phải chọn ít nhất 1 đáp án đúng.`)
          }
        } else if (q.questionType === 'FILL_BLANK' && opts.length === 0) {
          return fail(400, 'ACCEPTED_ANSWER_REQUIRED', `Câu #${qi + 1} cần ít nhất 1 đáp án đúng.`)
        }
      }
    }

    let nextOrder = 1
    ex.questionGroups = groups.map((g, gi) => ({
      id: `tqg-${crypto.randomUUID()}`,
      groupTitle: g.groupTitle?.trim() || null,
      groupInstruction: g.groupInstruction?.trim() || null,
      passageReference: g.passageReference?.trim() || null,
      imageUrl: g.imageUrl?.trim() || null,
      questionType: g.questionType ?? g.questions[0].questionType,
      questionRange: g.questionRange?.trim() || null,
      ordering: g.ordering ?? gi + 1,
      questions: g.questions.map((q) => {
        const order = q.ordering ?? nextOrder++
        return {
          id: `tq-${crypto.randomUUID()}`,
          questionText: q.questionText.trim(),
          questionType: q.questionType,
          explanation: q.explanation?.trim() || null,
          points: q.points ?? 1,
          ordering: order,
          options: (q.options ?? []).map((o, oi) => ({
            id: `to-${crypto.randomUUID()}`,
            optionText: o.optionText.trim(),
            isCorrect: q.questionType === 'FILL_BLANK' || Boolean(o.isCorrect),
            point: o.point ?? (o.isCorrect ? q.points : 0),
            ordering: o.ordering ?? oi + 1,
          })),
        }
      }),
    }))
    ex.totalQuestions = ex.questionGroups.reduce((n, g) => n + g.questions.length, 0)
    ex.updatedAt = new Date().toISOString()
    persist()
    return ok(ex)
  }),

  // ---------------------------------------------------------------- progress & grading (teacher + admin)
  http.get(`${API}/admin/courses/:id/students`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    const url = new URL(request.url)
    return ok(
      buildMockCourseStudents(
        course,
        url.searchParams.get('q') ?? '',
        url.searchParams.get('scheduleStatus') ?? '',
      ),
    )
  }),

  http.get(`${API}/admin/courses/:id/students/:studentId`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.id)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    const detail = buildMockStudentProgressDetail(course, String(params.studentId))
    return detail ? ok(detail) : fail(404, 'NOT_FOUND', 'Enrollment not found')
  }),

  http.post(
    `${API}/admin/courses/:id/sections/:sectionId/students/:studentId/final-test/unlock`,
    async ({ request, params }) => {
      await delay(LATENCY)
      const user = currentUser(request)
      if (!user) return unauthorized()
      if (user.role !== 'ADMIN') return forbidden()

      const courseId = String(params.id)
      const sectionId = String(params.sectionId)
      const studentId = String(params.studentId)
      const course = db.moderationCourses.find((c) => c.id === courseId)
      if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
      const body = (await request.json().catch(() => ({}))) as { deadlineDays?: number }
      const days = body.deadlineDays && body.deadlineDays > 0 ? body.deadlineDays : 7
      const now = new Date()
      const existing = db.studentFinalTestGrants.find(
        (g) => g.courseId === courseId && g.sectionId === sectionId && g.userId === studentId,
      )
      const unlockedAt = now.toISOString()
      const expiresAt = new Date(now.getTime() + days * 86_400_000).toISOString()
      if (existing) {
        existing.unlocked = true
        existing.deadlineDays = days
        existing.unlockedAt = unlockedAt
        existing.expiresAt = expiresAt
      } else {
        db.studentFinalTestGrants.push({
          courseId,
          sectionId,
          userId: studentId,
          unlocked: true,
          deadlineDays: days,
          unlockedAt,
          expiresAt,
        })
      }
      persist()
      const progress = buildMockSectionFinalTestProgress(course, sectionId, studentId)
      return progress ? ok(progress) : fail(404, 'NOT_FOUND', 'Final test not found')
    },
  ),

  http.post(
    `${API}/admin/courses/:id/sections/:sectionId/students/:studentId/final-test/lock`,
    async ({ request, params }) => {
      await delay(LATENCY)
      const user = currentUser(request)
      if (!user) return unauthorized()
      if (user.role !== 'ADMIN') return forbidden()

      const courseId = String(params.id)
      const sectionId = String(params.sectionId)
      const studentId = String(params.studentId)
      const course = db.moderationCourses.find((c) => c.id === courseId)
      if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
      db.studentFinalTestGrants = db.studentFinalTestGrants.filter(
        (g) => !(g.courseId === courseId && g.sectionId === sectionId && g.userId === studentId),
      )
      persist()
      const progress = buildMockSectionFinalTestProgress(course, sectionId, studentId)
      return progress ? ok(progress) : fail(404, 'NOT_FOUND', 'Final test not found')
    },
  ),

  http.get(`${API}/teacher/courses/:courseId/students`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.courseId)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.teacherId !== user.id) return forbidden()
    const url = new URL(request.url)
    return ok(
      buildMockCourseStudents(
        course,
        url.searchParams.get('q') ?? '',
        url.searchParams.get('scheduleStatus') ?? '',
      ),
    )
  }),

  http.get(`${API}/teacher/courses/:courseId/students/:studentId`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const course = db.moderationCourses.find((c) => c.id === params.courseId)
    if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
    if (course.teacherId !== user.id) return forbidden()
    const detail = buildMockStudentProgressDetail(course, String(params.studentId))
    return detail ? ok(detail) : fail(404, 'NOT_FOUND', 'Enrollment not found')
  }),

  http.post(
    `${API}/teacher/courses/:courseId/sections/:sectionId/students/:studentId/final-test/unlock`,
    async ({ request, params }) => {
      await delay(LATENCY)
      const user = currentUser(request)
      if (!user) return unauthorized()
      if (user.role !== 'TEACHER') return forbidden()

      const courseId = String(params.courseId)
      const sectionId = String(params.sectionId)
      const studentId = String(params.studentId)
      const course = db.moderationCourses.find((c) => c.id === courseId)
      if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
      if (course.teacherId !== user.id) return forbidden()
      const body = (await request.json().catch(() => ({}))) as { deadlineDays?: number }
      const days = body.deadlineDays && body.deadlineDays > 0 ? body.deadlineDays : 7
      const now = new Date()
      const existing = db.studentFinalTestGrants.find(
        (g) => g.courseId === courseId && g.sectionId === sectionId && g.userId === studentId,
      )
      const unlockedAt = now.toISOString()
      const expiresAt = new Date(now.getTime() + days * 86_400_000).toISOString()
      if (existing) {
        existing.unlocked = true
        existing.deadlineDays = days
        existing.unlockedAt = unlockedAt
        existing.expiresAt = expiresAt
      } else {
        db.studentFinalTestGrants.push({
          courseId,
          sectionId,
          userId: studentId,
          unlocked: true,
          deadlineDays: days,
          unlockedAt,
          expiresAt,
        })
      }
      persist()
      const progress = buildMockSectionFinalTestProgress(course, sectionId, studentId)
      return progress ? ok(progress) : fail(404, 'NOT_FOUND', 'Final test not found')
    },
  ),

  http.post(
    `${API}/teacher/courses/:courseId/sections/:sectionId/students/:studentId/final-test/lock`,
    async ({ request, params }) => {
      await delay(LATENCY)
      const user = currentUser(request)
      if (!user) return unauthorized()
      if (user.role !== 'TEACHER') return forbidden()

      const courseId = String(params.courseId)
      const sectionId = String(params.sectionId)
      const studentId = String(params.studentId)
      const course = db.moderationCourses.find((c) => c.id === courseId)
      if (!course) return fail(404, 'NOT_FOUND', 'Course not found')
      if (course.teacherId !== user.id) return forbidden()
      db.studentFinalTestGrants = db.studentFinalTestGrants.filter(
        (g) => !(g.courseId === courseId && g.sectionId === sectionId && g.userId === studentId),
      )
      persist()
      const progress = buildMockSectionFinalTestProgress(course, sectionId, studentId)
      return progress ? ok(progress) : fail(404, 'NOT_FOUND', 'Final test not found')
    },
  ),

  http.get(`${API}/teacher/submissions/:submissionId`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const s = db.submissions.find((x) => x.id === params.submissionId)
    if (!s) return fail(404, 'NOT_FOUND', 'Submission not found')
    const meta = findAnyExerciseMeta(s.exerciseId)
    const course = meta?.courseId ? db.moderationCourses.find((c) => c.id === meta.courseId) : null
    if (!course || course.teacherId !== user.id) return forbidden()
    return ok(toBeSubmissionDetail(s))
  }),

  http.put(`${API}/teacher/submissions/:submissionId/feedback`, async ({ request, params }) => {
    await delay(LATENCY)
    const user = currentUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'TEACHER') return forbidden()

    const s = db.submissions.find((x) => x.id === params.submissionId)
    if (!s) return fail(404, 'NOT_FOUND', 'Submission not found')
    const meta = findAnyExerciseMeta(s.exerciseId)
    const course = meta?.courseId ? db.moderationCourses.find((c) => c.id === meta.courseId) : null
    if (!course || course.teacherId !== user.id) return forbidden()

    const body = (await request.json()) as {
      teacherScore?: number | null
      teacherFeedback?: string
    }
    const feedback = body.teacherFeedback?.trim() ?? ''
    if (!feedback) {
      return fail(400, 'VALIDATION_ERROR', 'Vui lòng nhập nhận xét của giáo viên.')
    }
    if (body.teacherScore !== null && body.teacherScore !== undefined) {
      if (body.teacherScore < 0 || body.teacherScore > s.maxScore) {
        return fail(400, 'INVALID_SCORE', `Điểm giáo viên không được vượt quá ${s.maxScore}`)
      }
      if (
        (meta?.skillType === 'WRITING' || meta?.skillType === 'SPEAKING') &&
        Math.abs((body.teacherScore * 2) % 1) > 1e-6
      ) {
        return fail(400, 'INVALID_SCORE_STEP', 'Điểm Writing/Speaking phải theo bước 0.5')
      }
      s.teacherScore = body.teacherScore
      s.score = body.teacherScore
    } else {
      s.teacherScore = null
      if (s.aiScore !== null && s.aiScore !== undefined) {
        s.score = s.aiScore
      }
    }
    s.teacherFeedback = feedback
    s.gradingMethod = 'TEACHER'
    s.gradedByName = user.fullName
    s.gradedAt = new Date().toISOString()
    persist()
    return ok(toBeSubmissionDetail(s))
  }),
]
