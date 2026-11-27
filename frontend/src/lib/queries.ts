import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  CategoryInput,
  ContentStatus,
  CreateTeacherInput,
  KgRecommendationsRequest,
  ProfileSkill,
  ReplaceExerciseQuestionsInput,
  SkillType,
  SpeakingSubmissionRequest,
  SubmissionRequest,
  TeacherCourseInput,
  TeacherExerciseInput,
  TeacherLessonInput,
  TeacherSectionInput,
  TeacherSubmissionFeedbackInput,
  UpdateTeacherInput,
  UserStatus,
  WritingSubmissionRequest,
} from './types'

export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  myCourses: ['courses', 'my'] as const,
  catalogCourses: (p: { q?: string; skill?: SkillType | ''; page?: number; size?: number }) =>
    ['courses', 'catalog', p.q ?? '', p.skill ?? '', p.page ?? 1, p.size ?? 20] as const,
  course: (id: string) => ['courses', id] as const,
  lesson: (id: string) => ['lessons', id] as const,
  sectionExercises: (id: string) => ['sections', id, 'exercises'] as const,
  sectionMockTests: (id: string) => ['sections', id, 'mock-tests'] as const,
  sectionFinalTest: (id: string) => ['sections', id, 'final-test'] as const,
  lessonExercises: (id: string) => ['lessons', id, 'exercises'] as const,
  exercise: (id: string) => ['exercises', id] as const,
  submission: (id: string) => ['submissions', id] as const,
  mySubmissions: ['submissions', 'me'] as const,
  kgRecommendations: (r: KgRecommendationsRequest | null) =>
    ['kg', 'recommendations', r?.skill, r?.errors.join(','), r?.band] as const,
  personalization: ['personalization'] as const,
  categories: ['categories'] as const,
  adminCategories: (p: { isActive?: boolean; q?: string; page?: number; size?: number }) =>
    ['admin', 'categories', p.isActive ?? 'all', p.q ?? '', p.page ?? 1, p.size ?? 10] as const,
  adminTeachers: (p: { status?: UserStatus | ''; q?: string; page?: number; size?: number }) =>
    ['admin', 'teachers', p.status ?? '', p.q ?? '', p.page ?? 1, p.size ?? 10] as const,
  adminStudents: (p: { status?: UserStatus | ''; q?: string; page?: number; size?: number }) =>
    ['admin', 'students', p.status ?? '', p.q ?? '', p.page ?? 1, p.size ?? 10] as const,
  adminCourses: (p: {
    status?: ContentStatus | ''
    isActive?: boolean
    skill?: SkillType | ''
    categoryId?: string
    q?: string
    page?: number
    size?: number
  }) =>
    [
      'admin',
      'courses',
      p.status ?? '',
      p.isActive ?? 'all',
      p.skill ?? '',
      p.categoryId ?? '',
      p.q ?? '',
      p.page ?? 1,
      p.size ?? 10,
    ] as const,
  adminCourseReviews: (p: { status?: ContentStatus; page?: number; size?: number }) =>
    ['admin', 'reviews', 'courses', p.status ?? 'PENDING_REVIEW', p.page ?? 1, p.size ?? 10] as const,
  adminLessonReviews: (p: { status?: ContentStatus; page?: number; size?: number }) =>
    ['admin', 'reviews', 'lessons', p.status ?? 'PENDING_REVIEW', p.page ?? 1, p.size ?? 10] as const,
  adminCourseDetail: (id: string) => ['admin', 'courses', id] as const,
  adminCourseStudents: (courseId: string, p?: { q?: string; scheduleStatus?: string }) =>
    ['admin', 'courses', courseId, 'students', p?.q ?? '', p?.scheduleStatus ?? ''] as const,
  adminStudentProgress: (courseId: string, studentId: string) =>
    ['admin', 'courses', courseId, 'students', studentId] as const,
  teacherCourses: (p: { status?: ContentStatus | ''; page?: number; size?: number }) =>
    ['teacher', 'courses', p.status ?? '', p.page ?? 1, p.size ?? 10] as const,
  teacherCourseDetail: (id: string) => ['teacher', 'courses', id] as const,
  teacherCourseStudents: (courseId: string, p?: { q?: string; scheduleStatus?: string }) =>
    ['teacher', 'courses', courseId, 'students', p?.q ?? '', p?.scheduleStatus ?? ''] as const,
  teacherStudentProgress: (courseId: string, studentId: string) =>
    ['teacher', 'courses', courseId, 'students', studentId] as const,
  teacherSubmissionDetail: (submissionId: string) =>
    ['teacher', 'submissions', submissionId] as const,
  teacherLessonExercises: (lessonId: string) => ['teacher', 'lessons', lessonId, 'exercises'] as const,
  teacherExerciseDetail: (id: string) => ['teacher', 'exercises', id] as const,
}

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard })
export const useMyCourses = () => useQuery({ queryKey: keys.myCourses, queryFn: api.myCourses })

export const useCatalogCourses = (params: {
  q?: string
  skill?: SkillType | ''
  page?: number
  size?: number
} = {}) =>
  useQuery({
    queryKey: keys.catalogCourses(params),
    queryFn: () => api.catalogCourses(params),
  })

export function useEnrollCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) => api.enrollCourse(courseId),
    onSuccess: (_data, courseId) => {
      qc.invalidateQueries({ queryKey: ['courses'] })
      qc.invalidateQueries({ queryKey: keys.course(courseId) })
      qc.invalidateQueries({ queryKey: keys.dashboard })
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export const useCourse = (id: string | undefined) =>
  useQuery({ queryKey: keys.course(id ?? ''), queryFn: () => api.course(id!), enabled: !!id })

export const useLesson = (id: string | undefined) =>
  useQuery({ queryKey: keys.lesson(id ?? ''), queryFn: () => api.lesson(id!), enabled: !!id })

export const useSectionExercises = (id: string | undefined) =>
  useQuery({
    queryKey: keys.sectionExercises(id ?? ''),
    queryFn: () => api.sectionExercises(id!),
    enabled: !!id,
  })

export const useSectionMockTests = (id: string | undefined) =>
  useQuery({
    queryKey: keys.sectionMockTests(id ?? ''),
    queryFn: () => api.sectionMockTests(id!),
    enabled: !!id,
  })

export const useSectionFinalTest = (id: string | undefined) =>
  useQuery({
    queryKey: keys.sectionFinalTest(id ?? ''),
    queryFn: () => api.sectionFinalTest(id!),
    enabled: !!id,
  })

export function useStartFinalTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sectionId: string) => api.startSectionFinalTest(sectionId),
    onSuccess: (_data, sectionId) => {
      qc.invalidateQueries({ queryKey: keys.sectionFinalTest(sectionId) })
    },
  })
}

export const useLessonExercises = (id: string | undefined) =>
  useQuery({
    queryKey: keys.lessonExercises(id ?? ''),
    queryFn: () => api.lessonExercises(id!),
    enabled: !!id,
  })

export const useExercise = (id: string | undefined) =>
  useQuery({
    queryKey: keys.exercise(id ?? ''),
    queryFn: () => api.exercise(id!),
    enabled: !!id,
    staleTime: Infinity,
  })

export const useSubmission = (id: string | undefined) =>
  useQuery({
    queryKey: keys.submission(id ?? ''),
    queryFn: () => api.submission(id!),
    enabled: !!id,
  })

export const useMySubmissions = () =>
  useQuery({ queryKey: keys.mySubmissions, queryFn: api.mySubmissions })

/** Disabled without errors. Not retried: a KG that is down answers 503 again right away. */
export const useKgRecommendations = (request: KgRecommendationsRequest | null) =>
  useQuery({
    queryKey: keys.kgRecommendations(request),
    queryFn: () => api.kgRecommendations(request!),
    enabled: !!request && request.errors.length > 0,
    retry: false,
    staleTime: 5 * 60_000,
  })

/** Not retried: a KG that is down answers 503 again right away. */
export const usePersonalization = () =>
  useQuery({ queryKey: keys.personalization, queryFn: api.personalization, retry: false })

/** The response is the updated personalization, so it replaces the cached one. */
export function useSetTargetBand() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ skill, targetBand }: { skill: ProfileSkill; targetBand: number }) =>
      api.setTargetBand(skill, targetBand),
    onSuccess: (data) => qc.setQueryData(keys.personalization, data),
  })
}

function useInvalidateAfterSubmit() {
  const qc = useQueryClient()
  // Scores, progress and history all depend on submissions.
  return () => {
    qc.invalidateQueries({ queryKey: ['sections'] })
    qc.invalidateQueries({ queryKey: ['lessons'] })
    qc.invalidateQueries({ queryKey: ['courses'] })
    qc.invalidateQueries({ queryKey: keys.mySubmissions })
    qc.invalidateQueries({ queryKey: keys.dashboard })
    qc.invalidateQueries({ queryKey: keys.personalization })
  }
}

export function useSubmit() {
  const invalidate = useInvalidateAfterSubmit()
  return useMutation({
    mutationFn: (body: SubmissionRequest) => api.submit(body),
    onSuccess: invalidate,
  })
}

export function useSubmitWriting() {
  const invalidate = useInvalidateAfterSubmit()
  return useMutation({
    mutationFn: (body: WritingSubmissionRequest) => api.submitWriting(body),
    onSuccess: invalidate,
  })
}

export function useSubmitSpeaking() {
  const invalidate = useInvalidateAfterSubmit()
  return useMutation({
    mutationFn: (body: SpeakingSubmissionRequest) => api.submitSpeaking(body),
    onSuccess: invalidate,
  })
}

// ---------------------------------------------------------------- admin hooks

export const useCategories = () =>
  useQuery({ queryKey: keys.categories, queryFn: api.categories, staleTime: 5 * 60_000 })

export const useAdminCategories = (params: {
  isActive?: boolean
  q?: string
  page?: number
  size?: number
}) =>
  useQuery({
    queryKey: keys.adminCategories(params),
    queryFn: () => api.adminCategories(params),
  })

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CategoryInput) => api.adminCreateCategory(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: keys.categories })
    },
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CategoryInput }) =>
      api.adminUpdateCategory(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
      qc.invalidateQueries({ queryKey: keys.categories })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.adminDeleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'categories'] })
      qc.invalidateQueries({ queryKey: keys.categories })
    },
  })
}

export const useAdminTeachers = (params: {
  status?: UserStatus | ''
  q?: string
  page?: number
  size?: number
}) =>
  useQuery({
    queryKey: keys.adminTeachers(params),
    queryFn: () => api.adminTeachers(params),
  })

export function useCreateTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTeacherInput) => api.adminCreateTeacher(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
    },
  })
}

export function useUpdateTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTeacherInput }) =>
      api.adminUpdateTeacher(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] })
    },
  })
}

export function useResetTeacherPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.adminResetTeacherPassword(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
    },
  })
}

export function useApproveTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.adminApproveTeacher(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
    },
  })
}

export function useLockTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.adminLockTeacher(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
    },
  })
}

export function useUnlockTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.adminUnlockTeacher(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
    },
  })
}

export const useAdminStudents = (params: {
  status?: UserStatus | ''
  q?: string
  page?: number
  size?: number
}) =>
  useQuery({
    queryKey: keys.adminStudents(params),
    queryFn: () => api.adminStudents(params),
  })

export function useLockStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.adminLockStudent(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}

export function useUnlockStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.adminUnlockStudent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}

export const useAdminCourses = (params: {
  status?: ContentStatus | ''
  isActive?: boolean
  skill?: SkillType | ''
  categoryId?: string
  q?: string
  page?: number
  size?: number
}) =>
  useQuery({
    queryKey: keys.adminCourses(params),
    queryFn: () => api.adminCourses(params),
  })

export function useSetCourseFeatured() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      api.adminSetCourseFeatured(id, featured),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useDeactivateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.adminDeactivateCourse(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useActivateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.adminActivateCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export const useAdminCourseReviews = (params: {
  status?: ContentStatus
  page?: number
  size?: number
}) =>
  useQuery({
    queryKey: keys.adminCourseReviews(params),
    queryFn: () => api.adminCourseReviews(params),
  })

export const useAdminLessonReviews = (params: {
  status?: ContentStatus
  page?: number
  size?: number
}) =>
  useQuery({
    queryKey: keys.adminLessonReviews(params),
    queryFn: () => api.adminLessonReviews(params),
  })

export const useAdminCourseDetail = (id: string | undefined) =>
  useQuery({
    queryKey: keys.adminCourseDetail(id ?? ''),
    queryFn: () => api.adminCourseDetail(id!),
    enabled: !!id,
  })

export function useApproveCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => api.adminApproveCourse(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useRejectCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.adminRejectCourse(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useApproveLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => api.adminApproveLesson(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useRejectLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.adminRejectLesson(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

// ---------------------------------------------------------------- teacher hooks

export const useTeacherCourses = (params: {
  status?: ContentStatus | ''
  page?: number
  size?: number
}) =>
  useQuery({
    queryKey: keys.teacherCourses(params),
    queryFn: () => api.teacherCourses(params),
  })

export const useTeacherCourseDetail = (id: string | undefined) =>
  useQuery({
    queryKey: keys.teacherCourseDetail(id ?? ''),
    queryFn: () => api.teacherCourseDetail(id!),
    enabled: !!id,
  })

export function useSubmitCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teacherSubmitCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TeacherCourseInput) => api.teacherCreateCourse(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TeacherCourseInput }) =>
      api.teacherUpdateCourse(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useDeleteCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teacherDeleteCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useWithdrawCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teacherWithdrawCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useArchiveCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teacherArchiveCourse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useCreateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, body }: { courseId: string; body: TeacherSectionInput }) =>
      api.teacherCreateSection(courseId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
    },
  })
}

export function useUpdateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TeacherSectionInput }) =>
      api.teacherUpdateSection(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
    },
  })
}

export function useDeleteSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teacherDeleteSection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
    },
  })
}

export function useCreateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sectionId, body }: { sectionId: string; body: TeacherLessonInput }) =>
      api.teacherCreateLesson(sectionId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
    },
  })
}

export function useUpdateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TeacherLessonInput }) =>
      api.teacherUpdateLesson(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useDeleteLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teacherDeleteLesson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
    },
  })
}

export function useSubmitLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teacherSubmitLesson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export function useWithdrawLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teacherWithdrawLesson(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export const useTeacherLessonExercises = (lessonId: string | undefined) =>
  useQuery({
    queryKey: keys.teacherLessonExercises(lessonId ?? ''),
    queryFn: () => api.teacherLessonExercises(lessonId!),
    enabled: !!lessonId,
  })

export const useTeacherExerciseDetail = (id: string | undefined) =>
  useQuery({
    queryKey: keys.teacherExerciseDetail(id ?? ''),
    queryFn: () => api.teacherExerciseDetail(id!),
    enabled: !!id,
  })

export function useCreateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lessonId, body }: { lessonId: string; body: TeacherExerciseInput }) =>
      api.teacherCreateExercise(lessonId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
    },
  })
}

export function useUpdateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TeacherExerciseInput }) =>
      api.teacherUpdateExercise(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
    },
  })
}

export function useDeleteExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.teacherDeleteExercise(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
    },
  })
}

export function useReplaceExerciseQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReplaceExerciseQuestionsInput }) =>
      api.teacherReplaceExerciseQuestions(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher'] })
    },
  })
}

export const useAdminCourseStudents = (
  courseId: string | undefined,
  params?: { q?: string; scheduleStatus?: string },
) =>
  useQuery({
    queryKey: keys.adminCourseStudents(courseId ?? '', params),
    queryFn: () => api.adminCourseStudents(courseId!, params),
    enabled: !!courseId,
  })

export const useAdminStudentProgress = (
  courseId: string | undefined,
  studentId: string | undefined,
) =>
  useQuery({
    queryKey: keys.adminStudentProgress(courseId ?? '', studentId ?? ''),
    queryFn: () => api.adminStudentProgress(courseId!, studentId!),
    enabled: !!courseId && !!studentId,
  })

export const useTeacherCourseStudents = (
  courseId: string | undefined,
  params?: { q?: string; scheduleStatus?: string },
) =>
  useQuery({
    queryKey: keys.teacherCourseStudents(courseId ?? '', params),
    queryFn: () => api.teacherCourseStudents(courseId!, params),
    enabled: !!courseId,
  })

export const useTeacherStudentProgress = (
  courseId: string | undefined,
  studentId: string | undefined,
) =>
  useQuery({
    queryKey: keys.teacherStudentProgress(courseId ?? '', studentId ?? ''),
    queryFn: () => api.teacherStudentProgress(courseId!, studentId!),
    enabled: !!courseId && !!studentId,
  })

export function useAdminUnlockStudentFinalTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      courseId,
      sectionId,
      studentId,
      deadlineDays,
    }: {
      courseId: string
      sectionId: string
      studentId: string
      deadlineDays: number
    }) => api.adminUnlockStudentFinalTest(courseId, sectionId, studentId, deadlineDays),
    onSuccess: (_data, { courseId, sectionId, studentId }) => {
      qc.invalidateQueries({ queryKey: keys.adminStudentProgress(courseId, studentId) })
      qc.invalidateQueries({ queryKey: keys.teacherStudentProgress(courseId, studentId) })
      qc.invalidateQueries({ queryKey: keys.sectionFinalTest(sectionId) })
      qc.invalidateQueries({ queryKey: ['sections'] })
    },
  })
}

export function useAdminLockStudentFinalTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      courseId,
      sectionId,
      studentId,
    }: {
      courseId: string
      sectionId: string
      studentId: string
    }) => api.adminLockStudentFinalTest(courseId, sectionId, studentId),
    onSuccess: (_data, { courseId, sectionId, studentId }) => {
      qc.invalidateQueries({ queryKey: keys.adminStudentProgress(courseId, studentId) })
      qc.invalidateQueries({ queryKey: keys.teacherStudentProgress(courseId, studentId) })
      qc.invalidateQueries({ queryKey: keys.sectionFinalTest(sectionId) })
      qc.invalidateQueries({ queryKey: ['sections'] })
    },
  })
}

export function useTeacherUnlockStudentFinalTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      courseId,
      sectionId,
      studentId,
      deadlineDays,
    }: {
      courseId: string
      sectionId: string
      studentId: string
      deadlineDays: number
    }) => api.teacherUnlockStudentFinalTest(courseId, sectionId, studentId, deadlineDays),
    onSuccess: (_data, { courseId, sectionId, studentId }) => {
      qc.invalidateQueries({ queryKey: keys.teacherStudentProgress(courseId, studentId) })
      qc.invalidateQueries({ queryKey: keys.adminStudentProgress(courseId, studentId) })
      qc.invalidateQueries({ queryKey: keys.sectionFinalTest(sectionId) })
      qc.invalidateQueries({ queryKey: ['sections'] })
    },
  })
}

export function useTeacherLockStudentFinalTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      courseId,
      sectionId,
      studentId,
    }: {
      courseId: string
      sectionId: string
      studentId: string
    }) => api.teacherLockStudentFinalTest(courseId, sectionId, studentId),
    onSuccess: (_data, { courseId, sectionId, studentId }) => {
      qc.invalidateQueries({ queryKey: keys.teacherStudentProgress(courseId, studentId) })
      qc.invalidateQueries({ queryKey: keys.adminStudentProgress(courseId, studentId) })
      qc.invalidateQueries({ queryKey: keys.sectionFinalTest(sectionId) })
      qc.invalidateQueries({ queryKey: ['sections'] })
    },
  })
}

export const useTeacherSubmissionDetail = (submissionId: string | undefined) =>
  useQuery({
    queryKey: keys.teacherSubmissionDetail(submissionId ?? ''),
    queryFn: () => api.teacherSubmissionDetail(submissionId!),
    enabled: !!submissionId,
  })

export function useTeacherGradeSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      submissionId,
      body,
    }: {
      submissionId: string
      body: TeacherSubmissionFeedbackInput
    }) => api.teacherGradeSubmission(submissionId, body),
    onSuccess: (_data, { submissionId }) => {
      qc.invalidateQueries({ queryKey: keys.teacherSubmissionDetail(submissionId) })
      qc.invalidateQueries({ queryKey: keys.submission(submissionId) })
      qc.invalidateQueries({ queryKey: ['teacher'] })
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: keys.mySubmissions })
    },
  })
}
