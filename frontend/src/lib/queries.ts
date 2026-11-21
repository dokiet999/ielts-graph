import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  KgRecommendationsRequest,
  ProfileSkill,
  SpeakingSubmissionRequest,
  SubmissionRequest,
  WritingSubmissionRequest,
} from './types'

export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  myCourses: ['courses', 'my'] as const,
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
}

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: api.dashboard })
export const useMyCourses = () => useQuery({ queryKey: keys.myCourses, queryFn: api.myCourses })

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

export function useUnlockFinalTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sectionId, deadlineDays }: { sectionId: string; deadlineDays: number }) =>
      api.unlockSectionFinalTest(sectionId, deadlineDays),
    onSuccess: (data, { sectionId }) => {
      qc.setQueryData(keys.sectionFinalTest(sectionId), data)
    },
  })
}

export function useLockFinalTest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sectionId: string) => api.lockSectionFinalTest(sectionId),
    onSuccess: (data, sectionId) => {
      qc.setQueryData(keys.sectionFinalTest(sectionId), data)
    },
  })
}

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
