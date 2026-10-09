import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type { SubmissionRequest } from './types'

export const keys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  myCourses: ['courses', 'my'] as const,
  course: (id: string) => ['courses', id] as const,
  lesson: (id: string) => ['lessons', id] as const,
  sectionExercises: (id: string) => ['sections', id, 'exercises'] as const,
  lessonExercises: (id: string) => ['lessons', id, 'exercises'] as const,
  exercise: (id: string) => ['exercises', id] as const,
  submission: (id: string) => ['submissions', id] as const,
  mySubmissions: ['submissions', 'me'] as const,
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

export function useSubmit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SubmissionRequest) => api.submit(body),
    onSuccess: (detail) => {
      qc.setQueryData(keys.submission(detail.id), detail)
      // Scores, progress and history all depend on submissions.
      qc.invalidateQueries({ queryKey: ['sections'] })
      qc.invalidateQueries({ queryKey: ['lessons'] })
      qc.invalidateQueries({ queryKey: ['courses'] })
      qc.invalidateQueries({ queryKey: keys.mySubmissions })
      qc.invalidateQueries({ queryKey: keys.dashboard })
    },
  })
}
