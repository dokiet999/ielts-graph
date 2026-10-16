import axios from 'axios'
import { demoAuthHeader, DEMO_MODE } from './demo'
import { useAuthStore } from '@/stores/auth'
import {
  toBackendAnswers,
  toCourseDetail,
  toCourseSummary,
  toDashboardStats,
  toExercise,
  toExerciseSummaries,
  toLesson,
  toSubmission,
  toSubmissionDetail,
  toWritingResult,
} from './adapters'
import type {
  BeCourseDetail,
  BeExercise,
  BeExerciseSummary,
  BeLessonDetail,
  BeMyCourse,
  BeSubmissionDetail,
  BeSubmissionSummary,
  BeSubmitResult,
  BeWritingResult,
} from './backend-types'
import type {
  AnswerValue,
  AuthResponse,
  CheckAnswerResponse,
  SubmissionRequest,
  User,
  WritingSubmissionRequest,
} from './types'
import { isRetryableWritingError, writingSubmitMessage } from './writing'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

http.interceptors.request.use((config) => {
  if (demoAuthHeader) {
    config.headers.Authorization = demoAuthHeader
    return config
  }
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
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
    const data = error.response?.data as { message?: string } | undefined
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

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

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
  login: (body: { email: string; password: string }) =>
    data(http.post<AuthResponse>('/auth/login', body)),
  register: (body: { fullName: string; email: string; password: string }) =>
    data(http.post<AuthResponse>('/auth/register', body)),
  me: () => data(http.get<User>('/users/me')),
  updateMe: (body: Partial<Pick<User, 'fullName' | 'phone' | 'bio' | 'avatarUrl'>>) =>
    data(http.put<User>('/users/me', body)),

  // No dashboard endpoint: the numbers are derived from the learner's courses and submissions.
  dashboard: () =>
    Promise.all([myCourses(), mySubmissions()]).then(([courses, submissions]) =>
      toDashboardStats(courses, submissions),
    ),
  myCourses,
  course: (id: string) => data(http.get<BeCourseDetail>(`/courses/${id}`)).then(toCourseDetail),
  lesson: (id: string) => lessonDetail(id).then(toLesson),
  sectionExercises: (sectionId: string) =>
    data(http.get<BeExerciseSummary[]>(`/sections/${sectionId}/exercises`)).then(
      toExerciseSummaries,
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
  submission: (id: string) =>
    data(http.get<BeSubmissionDetail>(`/submissions/${id}/detail`)).then(toSubmissionDetail),
  mySubmissions,
}
