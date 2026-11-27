import axios from 'axios'
import { demoAuthHeader, DEMO_MODE } from './demo'
import { useAuthStore } from '@/stores/auth'
import {
  toBackendAnswers,
  toCatalogCourse,
  toCourseDetail,
  toCourseSummary,
  toDashboardStats,
  toExercise,
  toExerciseSummaries,
  toFinalTestSession,
  toFinalTestStatus,
  toLesson,
  toSpeakingResult,
  toSubmission,
  toSubmissionDetail,
  toWritingResult,
} from './adapters'
import type {
  BeAdminCourseDetail,
  BeAdminCourseSummary,
  BeAdminLesson,
  BeAdminSection,
  BeBaseResponse,
  BeCategory,
  BeCourse,
  BeCourseDetail,
  BeCourseProgressOverview,
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
  BeTeacherLessonExercises,
  BeUser,
  BeWritingResult,
} from './backend-types'
import type {
  AdminCourseDetail,
  AdminCourseSummary,
  AdminLessonItem,
  AdminSectionItem,
  AnswerValue,
  AuthResponse,
  CatalogCourse,
  Category,
  CategoryInput,
  CheckAnswerResponse,
  ContentStatus,
  CourseProgressOverview,
  CreateTeacherInput,
  ExerciseType,
  KgRecommendations,
  KgRecommendationsRequest,
  PagedResult,
  Personalization,
  ProfileSkill,
  ReplaceExerciseQuestionsInput,
  ReviewQueueItem,
  ScheduleStatus,
  SectionFinalTestProgress,
  SkillType,
  SpeakingSubmissionRequest,
  StudentAccount,
  StudentCourseProgressDetail,
  SubmissionRequest,
  SubmissionStatus,
  TeacherAccount,
  TeacherCourseInput,
  TeacherCourseSummary,
  TeacherExerciseDetail,
  TeacherExerciseInput,
  TeacherLessonExercises,
  TeacherLessonInput,
  TeacherSectionInput,
  TeacherSubmissionFeedbackInput,
  UpdateTeacherInput,
  User,
  UserStatus,
  WritingSubmissionRequest,
} from './types'
import { isRetryableSpeakingError, speakingSubmitMessage } from './speaking'
import { isRetryableWritingError, writingSubmitMessage } from './writing'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

function encodeBasicToken(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return `Basic ${btoa(binary)}`
}

function mapBeUser(u: BeUser): User {
  return {
    id: u.id,
    username: u.username ?? undefined,
    email: u.email,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl ?? null,
    bio: u.bio ?? null,
    phone: u.phone ?? null,
    role: u.role,
    status: u.status,
  }
}

function mapTeacherLessonExercises(raw: BeTeacherLessonExercises): TeacherLessonExercises {
  return {
    ...raw,
    exercises: (raw.exercises ?? []).map((e) => ({
      ...e,
      passingScore: Number(e.passingScore ?? 0),
    })),
  }
}

function mapTeacherExerciseDetail(raw: BeTeacherExerciseDetail): TeacherExerciseDetail {
  return {
    ...raw,
    passingScore: Number(raw.passingScore ?? 0),
    questionGroups: (raw.questionGroups ?? []).map((g) => ({
      ...g,
      questions: (g.questions ?? []).map((q) => ({
        ...q,
        points: Number(q.points ?? 1),
        options: (q.options ?? []).map((o) => ({
          ...o,
          isCorrect: Boolean(o.isCorrect),
          point: o.point !== undefined && o.point !== null ? Number(o.point) : undefined,
        })),
      })),
    })),
  }
}

function mapCourseProgressOverview(raw: BeCourseProgressOverview): CourseProgressOverview {
  return {
    ...raw,
    students: (raw.students ?? []).map((s) => ({
      ...s,
      scheduleStatus: s.scheduleStatus as ScheduleStatus,
    })),
  }
}

function mapSectionFinalTestProgress(
  ft: BeSectionFinalTestProgress | null | undefined,
): SectionFinalTestProgress | null {
  if (!ft) return null
  return {
    ...ft,
    bestScore: ft.bestScore !== null && ft.bestScore !== undefined ? Number(ft.bestScore) : null,
  }
}

function mapStudentCourseProgressDetail(
  raw: BeStudentCourseProgressDetail,
): StudentCourseProgressDetail {
  return {
    ...raw,
    scheduleStatus: raw.scheduleStatus as ScheduleStatus,
    sections: (raw.sections ?? []).map((sec) => ({
      ...sec,
      finalTest: mapSectionFinalTestProgress(sec.finalTest),
      lessons: (sec.lessons ?? []).map((les) => ({
        ...les,
        exercises: (les.exercises ?? []).map((ex) => ({
          ...ex,
          exerciseType: ex.exerciseType as ExerciseType,
          skillType: ex.skillType as SkillType,
          maxScore: Number(ex.maxScore ?? 0),
          bestScore:
            ex.bestScore !== null && ex.bestScore !== undefined ? Number(ex.bestScore) : null,
          latestStatus: (ex.latestStatus as SubmissionStatus | null) ?? null,
        })),
      })),
    })),
    submissions: (raw.submissions ?? []).map((sub) => ({
      ...sub,
      skillType: sub.skillType as SkillType,
      exerciseType: sub.exerciseType as ExerciseType,
      status: sub.status as SubmissionStatus,
      score: Number(sub.score ?? 0),
      maxScore: Number(sub.maxScore ?? 0),
      aiScore: sub.aiScore !== null && sub.aiScore !== undefined ? Number(sub.aiScore) : null,
      teacherScore:
        sub.teacherScore !== null && sub.teacherScore !== undefined
          ? Number(sub.teacherScore)
          : null,
    })),
  }
}

http.interceptors.request.use((config) => {
  if (demoAuthHeader) {
    config.headers.Authorization = demoAuthHeader
    return config
  }
  if (!config.headers.Authorization) {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = token.startsWith('Basic ') ? token : `Bearer ${token}`
    }
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error) => {
    // In demo mode there is nothing to log out of (and logging out would loop), so only
    // real sessions are cleared on 401.
    if (!DEMO_MODE && axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra, vui lòng thử lại.') {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { code?: string; message?: string } | undefined
    if (data?.code === 'ACCOUNT_PENDING') {
      return 'Tài khoản giảng viên đang chờ quản trị viên phê duyệt.'
    }
    if (data?.code === 'ACCOUNT_LOCKED') {
      return 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.'
    }
    return data?.message ?? fallback
  }
  return fallback
}

/**
 * A failed essay submission as the UI shows it: Vietnamese text for the known backend codes, and
 * whether trying again may work (AI overloaded or slow, not a rule such as the attempt limit).
 */
export function writingSubmitError(error: unknown): { message: string; retryable: boolean } {
  if (axios.isAxiosError(error)) {
    const code = (error.response?.data as { code?: string } | undefined)?.code
    const status = error.response?.status
    // No response at all: the request timed out, or the network is down.
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    const message =
      writingSubmitMessage(timedOut ? 'LLM_TIMEOUT' : code, status) ?? errorMessage(error)
    return { message, retryable: timedOut || isRetryableWritingError(code, status) }
  }
  return { message: errorMessage(error), retryable: false }
}

export function speakingSubmitError(error: unknown): { message: string; retryable: boolean } {
  if (axios.isAxiosError(error)) {
    const code = (error.response?.data as { code?: string } | undefined)?.code
    const status = error.response?.status
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
    const message =
      speakingSubmitMessage(timedOut ? 'LLM_TIMEOUT' : code, status) ?? errorMessage(error)
    return { message, retryable: timedOut || isRetryableSpeakingError(code, status) }
  }
  return { message: errorMessage(error), retryable: false }
}

const unwrap = <T>(body: T | BeBaseResponse<T>): T =>
  body !== null &&
  typeof body === 'object' &&
  'meta' in body &&
  'data' in body &&
  (body as BeBaseResponse<T>).meta !== null &&
  typeof (body as BeBaseResponse<T>).meta === 'object'
    ? (body as BeBaseResponse<T>).data
    : (body as T)

const data = <T>(p: Promise<{ data: T | BeBaseResponse<T> }>) => p.then((r) => unwrap(r.data))

const paged = <T>(p: Promise<{ data: BeBaseResponse<T[]> }>): Promise<PagedResult<T>> =>
  p.then((r) => {
    const items = r.data.data ?? []
    const meta = r.data.meta ?? { code: 200 }
    const size = meta.size ?? (items.length || 10)
    const total = meta.total ?? items.length
    return {
      items,
      page: (meta.page ?? 0) + 1,
      size,
      total,
      totalPages: Math.max(1, Math.ceil(total / size)),
    }
  })

/**
 * Concurrent calls for the same lesson share one request (a lesson page asks for the lesson
 * and for its exercises, which come from the same endpoint).
 */
const lessonRequests = new Map<string, Promise<BeLessonDetail>>()
function lessonDetail(id: string) {
  let request = lessonRequests.get(id)
  if (!request) {
    request = data(http.get<BeLessonDetail>(`/lessons/${id}`)).finally(() =>
      lessonRequests.delete(id),
    )
    lessonRequests.set(id, request)
  }
  return request
}

const myCourses = () =>
  data(http.get<BeMyCourse[]>('/courses/my')).then((list) => list.map(toCourseSummary))
const mySubmissions = () =>
  data(http.get<BeSubmissionSummary[]>('/submissions/me')).then((list) => list.map(toSubmission))

export const api = {
  login: async (body: { email: string; password: string }): Promise<AuthResponse> => {
    if (import.meta.env.VITE_USE_MOCK === 'false') {
      const basicToken = encodeBasicToken(body.email.trim(), body.password)
      const user = await data(
        http.get<BeUser>('/users/me', { headers: { Authorization: basicToken } }),
      ).then(mapBeUser)
      return { accessToken: basicToken, user }
    }
    return data(http.post<AuthResponse>('/auth/login', body))
  },
  register: (body: { fullName: string; email: string; password: string }) =>
    data(http.post<AuthResponse>('/auth/register', body)),
  me: () => data(http.get<BeUser>('/users/me')).then(mapBeUser),
  updateMe: (body: Partial<Pick<User, 'fullName' | 'phone' | 'bio' | 'avatarUrl'>>) =>
    data(http.put<BeUser>('/users/me', body)).then(mapBeUser),

  // No dashboard endpoint: the numbers are derived from the learner's courses and submissions.
  dashboard: () =>
    Promise.all([myCourses(), mySubmissions()]).then(([courses, submissions]) =>
      toDashboardStats(courses, submissions),
    ),
  myCourses,
  catalogCourses: (params?: { q?: string; skill?: SkillType | ''; page?: number; size?: number }) =>
    paged<BeCourse>(
      http.get<BeBaseResponse<BeCourse[]>>('/courses', {
        params: {
          ...(params?.q?.trim() ? { q: params.q.trim() } : {}),
          ...(params?.skill ? { skill: params.skill } : {}),
          page: Math.max(0, (params?.page ?? 1) - 1),
          size: params?.size ?? 20,
        },
      }),
    ).then((res): PagedResult<CatalogCourse> => ({ ...res, items: res.items.map(toCatalogCourse) })),
  enrollCourse: (id: string) => data(http.post<unknown>(`/courses/${id}/enroll`)),
  course: (id: string) => data(http.get<BeCourseDetail>(`/courses/${id}`)).then(toCourseDetail),
  lesson: (id: string) => lessonDetail(id).then(toLesson),
  sectionExercises: (sectionId: string) =>
    data(http.get<BeExerciseSummary[]>(`/sections/${sectionId}/exercises`)).then(
      toExerciseSummaries,
    ),
  sectionMockTests: (sectionId: string) =>
    data(http.get<BeExerciseSummary[]>(`/sections/${sectionId}/mock-tests`)).then(
      toExerciseSummaries,
    ),
  sectionFinalTest: (sectionId: string) =>
    data(http.get<BeFinalTestStatus>(`/sections/${sectionId}/final-test`)).then(
      toFinalTestStatus,
    ),
  startSectionFinalTest: (sectionId: string) =>
    data(http.post<BeFinalTestSession>(`/sections/${sectionId}/final-test/start`)).then(
      toFinalTestSession,
    ),
  lessonExercises: (lessonId: string) =>
    lessonDetail(lessonId).then((r) => toExerciseSummaries(r.exercises)),

  exercise: (id: string) => data(http.get<BeExercise>(`/exercises/${id}`)).then(toExercise),
  // Not available on the backend yet (quiz mode only); kept for when POST /exercises/{id}/check lands.
  checkAnswer: (exerciseId: string, questionId: string, answer: AnswerValue) =>
    data(http.post<CheckAnswerResponse>(`/exercises/${exerciseId}/check`, { questionId, answer })),

  submit: (body: SubmissionRequest) =>
    data(
      http.post<BeSubmitResult>(`/exercises/${body.exerciseId}/submit`, {
        answers: toBackendAnswers(body.answers),
        timeSpent: Math.round(body.timeSpent),
      }),
    ).then((r) => ({ id: r.result.submissionId })),
  /** The AI call takes several seconds: the backend's own limit is 60s, so wait a little longer. */
  submitWriting: (body: WritingSubmissionRequest) =>
    data(
      http.post<BeWritingResult>(
        `/exercises/${body.exerciseId}/submit/writing`,
        { essayText: body.essayText, timeSpent: Math.round(body.timeSpent) },
        { timeout: 90_000 },
      ),
    ).then(toWritingResult),
  submitSpeaking: (body: SpeakingSubmissionRequest) => {
    const form = new FormData()
    const filename =
      body.filename ?? (body.audio instanceof File ? body.audio.name : 'recording.webm')
    form.append('audio', body.audio, filename)
    if (body.part) form.append('part', body.part)
    if (body.durationSec !== undefined)
      form.append('timeSpent', String(Math.round(body.durationSec)))
    return data(
      http.post<BeSpeakingResult>(`/exercises/${body.exerciseId}/submit/speaking`, form, {
        timeout: 180_000,
      }),
    ).then(toSpeakingResult)
  },
  submission: (id: string) =>
    data(http.get<BeSubmissionDetail>(`/submissions/${id}/detail`)).then(toSubmissionDetail),
  mySubmissions,

  /** Practice Resources for the grader's errors, from the Knowledge Graph (docs/kg-api-contract.md). */
  kgRecommendations: ({ skill, errors, band }: KgRecommendationsRequest) =>
    data(
      http.get<KgRecommendations>('/kg/recommendations', {
        params: { skill, errors: errors.join(','), band },
      }),
    ),

  // ---------------------------------------------------------------- categories
  categories: () => data(http.get<BeCategory[]>('/categories')) as Promise<Category[]>,

  // ---------------------------------------------------------------- admin
  adminCategories: (params: { isActive?: boolean; q?: string; page?: number; size?: number }) =>
    paged<Category>(
      http.get<BeBaseResponse<BeCategory[]>>('/admin/categories', {
        params: {
          ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
          ...(params.q?.trim() ? { q: params.q.trim() } : {}),
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.size ?? 10,
        },
      }),
    ),
  adminCreateCategory: (body: CategoryInput) =>
    data(http.post<BeCategory>('/admin/categories', body)) as Promise<Category>,
  adminUpdateCategory: (id: string, body: CategoryInput) =>
    data(http.put<BeCategory>(`/admin/categories/${id}`, body)) as Promise<Category>,
  adminDeleteCategory: (id: string) =>
    data(http.delete<null>(`/admin/categories/${id}`)) as Promise<null>,

  adminTeachers: (params: { status?: UserStatus | ''; q?: string; page?: number; size?: number }) =>
    paged<TeacherAccount>(
      http.get<BeBaseResponse<BeTeacherAccount[]>>('/admin/teachers', {
        params: {
          ...(params.status ? { status: params.status } : {}),
          ...(params.q?.trim() ? { q: params.q.trim() } : {}),
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.size ?? 10,
        },
      }),
    ),
  adminTeacherDetail: (id: string) =>
    data(http.get<BeTeacherAccount>(`/admin/teachers/${id}`)) as Promise<TeacherAccount>,
  adminCreateTeacher: (body: CreateTeacherInput) =>
    data(http.post<BeTeacherAccount>('/admin/teachers', body)) as Promise<TeacherAccount>,
  adminUpdateTeacher: (id: string, body: UpdateTeacherInput) =>
    data(http.put<BeTeacherAccount>(`/admin/teachers/${id}`, body)) as Promise<TeacherAccount>,
  adminResetTeacherPassword: (id: string) =>
    data(
      http.post<BeTeacherAccount>(`/admin/teachers/${id}/reset-password`),
    ) as Promise<TeacherAccount>,
  adminApproveTeacher: (id: string) =>
    data(http.post<BeTeacherAccount>(`/admin/teachers/${id}/approve`)) as Promise<TeacherAccount>,
  adminLockTeacher: (id: string, reason: string) =>
    data(
      http.post<BeTeacherAccount>(`/admin/teachers/${id}/lock`, { reason }),
    ) as Promise<TeacherAccount>,
  adminUnlockTeacher: (id: string) =>
    data(http.post<BeTeacherAccount>(`/admin/teachers/${id}/unlock`)) as Promise<TeacherAccount>,

  adminStudents: (params: { status?: UserStatus | ''; q?: string; page?: number; size?: number }) =>
    paged<StudentAccount>(
      http.get<BeBaseResponse<BeStudentAccount[]>>('/admin/students', {
        params: {
          ...(params.status ? { status: params.status } : {}),
          ...(params.q?.trim() ? { q: params.q.trim() } : {}),
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.size ?? 10,
        },
      }),
    ),
  adminLockStudent: (id: string, reason: string) =>
    data(
      http.post<BeStudentAccount>(`/admin/students/${id}/lock`, { reason }),
    ) as Promise<StudentAccount>,
  adminUnlockStudent: (id: string) =>
    data(http.post<BeStudentAccount>(`/admin/students/${id}/unlock`)) as Promise<StudentAccount>,

  adminCourses: (params: {
    status?: ContentStatus | ''
    isActive?: boolean
    skill?: SkillType | ''
    categoryId?: string
    q?: string
    page?: number
    size?: number
  }) =>
    paged<AdminCourseSummary>(
      http.get<BeBaseResponse<BeAdminCourseSummary[]>>('/admin/courses', {
        params: {
          ...(params.status ? { status: params.status } : {}),
          ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
          ...(params.skill ? { skill: params.skill } : {}),
          ...(params.categoryId ? { categoryId: params.categoryId } : {}),
          ...(params.q?.trim() ? { q: params.q.trim() } : {}),
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.size ?? 10,
        },
      }),
    ),
  adminSetCourseFeatured: (id: string, featured: boolean) =>
    data(
      http.patch<BeAdminCourseSummary>(`/admin/courses/${id}/featured`, { featured }),
    ) as Promise<AdminCourseSummary>,
  adminDeactivateCourse: (id: string, reason: string) =>
    data(
      http.post<BeAdminCourseSummary>(`/admin/courses/${id}/deactivate`, { reason }),
    ) as Promise<AdminCourseSummary>,
  adminActivateCourse: (id: string) =>
    data(http.post<BeAdminCourseSummary>(`/admin/courses/${id}/activate`)) as Promise<AdminCourseSummary>,
  adminCourseStudents: (courseId: string, params?: { q?: string; scheduleStatus?: string }) =>
    data(
      http.get<BeCourseProgressOverview>(`/admin/courses/${courseId}/students`, {
        params: {
          ...(params?.q?.trim() ? { q: params.q.trim() } : {}),
          ...(params?.scheduleStatus ? { scheduleStatus: params.scheduleStatus } : {}),
        },
      }),
    ).then(mapCourseProgressOverview),
  adminStudentProgress: (courseId: string, studentId: string) =>
    data(
      http.get<BeStudentCourseProgressDetail>(`/admin/courses/${courseId}/students/${studentId}`),
    ).then(mapStudentCourseProgressDetail),
  adminUnlockStudentFinalTest: (
    courseId: string,
    sectionId: string,
    studentId: string,
    deadlineDays: number,
  ) =>
    data(
      http.post<BeSectionFinalTestProgress>(
        `/admin/courses/${courseId}/sections/${sectionId}/students/${studentId}/final-test/unlock`,
        { deadlineDays },
      ),
    ).then((res) => mapSectionFinalTestProgress(res)!),
  adminLockStudentFinalTest: (courseId: string, sectionId: string, studentId: string) =>
    data(
      http.post<BeSectionFinalTestProgress>(
        `/admin/courses/${courseId}/sections/${sectionId}/students/${studentId}/final-test/lock`,
      ),
    ).then((res) => mapSectionFinalTestProgress(res)!),

  adminCourseReviews: (params: { status?: ContentStatus; page?: number; size?: number }) =>
    paged<ReviewQueueItem>(
      http.get<BeBaseResponse<BeReviewQueueItem[]>>('/admin/reviews/courses', {
        params: {
          status: params.status ?? 'PENDING_REVIEW',
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.size ?? 10,
        },
      }),
    ),
  adminLessonReviews: (params: { status?: ContentStatus; page?: number; size?: number }) =>
    paged<ReviewQueueItem>(
      http.get<BeBaseResponse<BeReviewQueueItem[]>>('/admin/reviews/lessons', {
        params: {
          status: params.status ?? 'PENDING_REVIEW',
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.size ?? 10,
        },
      }),
    ),
  adminCourseDetail: (id: string) =>
    data(http.get<BeAdminCourseDetail>(`/admin/courses/${id}`)) as Promise<AdminCourseDetail>,
  adminApproveCourse: (id: string, note?: string) =>
    data(
      http.post<BeAdminCourseDetail>(`/admin/courses/${id}/approve`, note ? { note } : {}),
    ) as Promise<AdminCourseDetail>,
  adminRejectCourse: (id: string, reason: string) =>
    data(
      http.post<BeAdminCourseDetail>(`/admin/courses/${id}/reject`, { reason }),
    ) as Promise<AdminCourseDetail>,
  adminApproveLesson: (id: string, note?: string) =>
    data(
      http.post<BeReviewQueueItem>(`/admin/lessons/${id}/approve`, note ? { note } : {}),
    ) as Promise<ReviewQueueItem>,
  adminRejectLesson: (id: string, reason: string) =>
    data(
      http.post<BeReviewQueueItem>(`/admin/lessons/${id}/reject`, { reason }),
    ) as Promise<ReviewQueueItem>,

  // ---------------------------------------------------------------- teacher
  teacherCourses: (params: { status?: ContentStatus | ''; page?: number; size?: number }) =>
    paged<TeacherCourseSummary>(
      http.get<BeBaseResponse<BeTeacherCourseSummary[]>>('/teacher/courses', {
        params: {
          ...(params.status ? { status: params.status } : {}),
          page: Math.max(0, (params.page ?? 1) - 1),
          size: params.size ?? 10,
        },
      }),
    ),
  teacherCourseDetail: (id: string) =>
    data(http.get<BeAdminCourseDetail>(`/teacher/courses/${id}`)) as Promise<AdminCourseDetail>,
  teacherCreateCourse: (body: TeacherCourseInput) =>
    data(http.post<BeAdminCourseDetail>('/teacher/courses', body)) as Promise<AdminCourseDetail>,
  teacherUpdateCourse: (id: string, body: TeacherCourseInput) =>
    data(
      http.put<BeAdminCourseDetail>(`/teacher/courses/${id}`, body),
    ) as Promise<AdminCourseDetail>,
  teacherDeleteCourse: (id: string) =>
    data(http.delete<null>(`/teacher/courses/${id}`)) as Promise<null>,
  teacherSubmitCourse: (id: string) =>
    data(
      http.post<BeAdminCourseDetail>(`/teacher/courses/${id}/submit`),
    ) as Promise<AdminCourseDetail>,
  teacherWithdrawCourse: (id: string) =>
    data(
      http.post<BeAdminCourseDetail>(`/teacher/courses/${id}/withdraw`),
    ) as Promise<AdminCourseDetail>,
  teacherArchiveCourse: (id: string) =>
    data(
      http.post<BeAdminCourseDetail>(`/teacher/courses/${id}/archive`),
    ) as Promise<AdminCourseDetail>,
  teacherCreateSection: (courseId: string, body: TeacherSectionInput) =>
    data(
      http.post<BeAdminSection>(`/teacher/courses/${courseId}/sections`, body),
    ) as Promise<AdminSectionItem>,
  teacherUpdateSection: (id: string, body: TeacherSectionInput) =>
    data(http.put<BeAdminSection>(`/teacher/sections/${id}`, body)) as Promise<AdminSectionItem>,
  teacherDeleteSection: (id: string) =>
    data(http.delete<null>(`/teacher/sections/${id}`)) as Promise<null>,
  teacherCreateLesson: (sectionId: string, body: TeacherLessonInput) =>
    data(
      http.post<BeAdminLesson>(`/teacher/sections/${sectionId}/lessons`, body),
    ) as Promise<AdminLessonItem>,
  teacherUpdateLesson: (id: string, body: TeacherLessonInput) =>
    data(http.put<BeAdminLesson>(`/teacher/lessons/${id}`, body)) as Promise<AdminLessonItem>,
  teacherDeleteLesson: (id: string) =>
    data(http.delete<null>(`/teacher/lessons/${id}`)) as Promise<null>,
  teacherSubmitLesson: (id: string) =>
    data(http.post<BeReviewQueueItem>(`/teacher/lessons/${id}/submit`)) as Promise<ReviewQueueItem>,
  teacherWithdrawLesson: (id: string) =>
    data(
      http.post<BeReviewQueueItem>(`/teacher/lessons/${id}/withdraw`),
    ) as Promise<ReviewQueueItem>,
  teacherLessonExercises: (lessonId: string) =>
    data(http.get<BeTeacherLessonExercises>(`/teacher/lessons/${lessonId}/exercises`)).then(
      mapTeacherLessonExercises,
    ),
  teacherCreateExercise: (lessonId: string, body: TeacherExerciseInput) =>
    data(http.post<BeTeacherExerciseDetail>(`/teacher/lessons/${lessonId}/exercises`, body)).then(
      mapTeacherExerciseDetail,
    ),
  teacherExerciseDetail: (id: string) =>
    data(http.get<BeTeacherExerciseDetail>(`/teacher/exercises/${id}`)).then(
      mapTeacherExerciseDetail,
    ),
  teacherUpdateExercise: (id: string, body: TeacherExerciseInput) =>
    data(http.put<BeTeacherExerciseDetail>(`/teacher/exercises/${id}`, body)).then(
      mapTeacherExerciseDetail,
    ),
  teacherDeleteExercise: (id: string) =>
    data(http.delete<null>(`/teacher/exercises/${id}`)) as Promise<null>,
  teacherReplaceExerciseQuestions: (id: string, body: ReplaceExerciseQuestionsInput) =>
    data(http.put<BeTeacherExerciseDetail>(`/teacher/exercises/${id}/questions`, body)).then(
      mapTeacherExerciseDetail,
    ),
  teacherCourseStudents: (courseId: string, params?: { q?: string; scheduleStatus?: string }) =>
    data(
      http.get<BeCourseProgressOverview>(`/teacher/courses/${courseId}/students`, {
        params: {
          ...(params?.q?.trim() ? { q: params.q.trim() } : {}),
          ...(params?.scheduleStatus ? { scheduleStatus: params.scheduleStatus } : {}),
        },
      }),
    ).then(mapCourseProgressOverview),
  teacherStudentProgress: (courseId: string, studentId: string) =>
    data(
      http.get<BeStudentCourseProgressDetail>(`/teacher/courses/${courseId}/students/${studentId}`),
    ).then(mapStudentCourseProgressDetail),
  teacherUnlockStudentFinalTest: (
    courseId: string,
    sectionId: string,
    studentId: string,
    deadlineDays: number,
  ) =>
    data(
      http.post<BeSectionFinalTestProgress>(
        `/teacher/courses/${courseId}/sections/${sectionId}/students/${studentId}/final-test/unlock`,
        { deadlineDays },
      ),
    ).then((res) => mapSectionFinalTestProgress(res)!),
  teacherLockStudentFinalTest: (courseId: string, sectionId: string, studentId: string) =>
    data(
      http.post<BeSectionFinalTestProgress>(
        `/teacher/courses/${courseId}/sections/${sectionId}/students/${studentId}/final-test/lock`,
      ),
    ).then((res) => mapSectionFinalTestProgress(res)!),
  teacherSubmissionDetail: (submissionId: string) =>
    data(http.get<BeSubmissionDetail>(`/teacher/submissions/${submissionId}`)).then(
      toSubmissionDetail,
    ),
  teacherGradeSubmission: (submissionId: string, body: TeacherSubmissionFeedbackInput) =>
    data(
      http.put<BeSubmissionDetail>(`/teacher/submissions/${submissionId}/feedback`, body),
    ).then(toSubmissionDetail),

  /** Weaknesses of the learner across their graded Writing and Speaking attempts (learner profile + KG). */
  personalization: () => data(http.get<Personalization>('/personalization')),
  setTargetBand: (skill: ProfileSkill, targetBand: number) =>
    data(http.put<Personalization>('/personalization/target-band', { skill, targetBand })),
}
