import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import type {
  AnswerValue,
  AuthResponse,
  CheckAnswerResponse,
  CourseDetail,
  CourseSummary,
  DashboardStats,
  Exercise,
  ExerciseSummary,
  Lesson,
  Submission,
  SubmissionDetail,
  SubmissionRequest,
  User,
} from './types'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
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

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export const api = {
  login: (body: { email: string; password: string }) =>
    data(http.post<AuthResponse>('/auth/login', body)),
  register: (body: { fullName: string; email: string; password: string }) =>
    data(http.post<AuthResponse>('/auth/register', body)),
  me: () => data(http.get<User>('/users/me')),
  updateMe: (body: Partial<Pick<User, 'fullName' | 'phone' | 'bio' | 'avatarUrl'>>) =>
    data(http.put<User>('/users/me', body)),

  dashboard: () => data(http.get<DashboardStats>('/dashboard/me')),
  myCourses: () => data(http.get<CourseSummary[]>('/courses/my')),
  course: (id: string) => data(http.get<CourseDetail>(`/courses/${id}`)),
  lesson: (id: string) => data(http.get<Lesson>(`/lessons/${id}`)),
  sectionExercises: (sectionId: string) =>
    data(http.get<ExerciseSummary[]>(`/sections/${sectionId}/exercises`)),
  lessonExercises: (lessonId: string) =>
    data(http.get<ExerciseSummary[]>(`/lessons/${lessonId}/exercises`)),

  exercise: (id: string) => data(http.get<Exercise>(`/exercises/${id}`)),
  checkAnswer: (exerciseId: string, questionId: string, answer: AnswerValue) =>
    data(http.post<CheckAnswerResponse>(`/exercises/${exerciseId}/check`, { questionId, answer })),

  submit: (body: SubmissionRequest) => data(http.post<SubmissionDetail>('/submissions', body)),
  submission: (id: string) => data(http.get<SubmissionDetail>(`/submissions/${id}`)),
  mySubmissions: () => data(http.get<Submission[]>('/submissions/me')),
}
