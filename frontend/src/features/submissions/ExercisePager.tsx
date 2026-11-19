import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSectionExercises, useSectionMockTests } from '@/lib/queries'
import type { ExerciseType } from '@/lib/types'

export interface ExercisePagerProps {
  sectionId?: string | null
  exerciseId: string
  exerciseType?: ExerciseType
}

/**
 * Renders Previous / Next exercise navigation buttons for an exercise inside a course section,
 * mirroring the lesson pager in LessonPage.tsx.
 */
export function ExercisePager({ sectionId, exerciseId, exerciseType }: ExercisePagerProps) {
  const isMock = exerciseType === 'MOCK_TEST'
  const { data: practiceList } = useSectionExercises(!isMock ? (sectionId ?? undefined) : undefined)
  const { data: mockList } = useSectionMockTests(isMock ? (sectionId ?? undefined) : undefined)
  const exercises = isMock ? mockList : practiceList
  const noun = isMock ? 'Bài thi thử' : 'Bài luyện'

  if (!sectionId || !exercises || exercises.length <= 1) return null

  const index = exercises.findIndex((e) => e.id === exerciseId)
  if (index === -1) return null

  const prev = exercises[index - 1]
  const next = exercises[index + 1]
  if (!prev && !next) return null

  return (
    <nav
      aria-label={`Điều hướng ${noun.toLowerCase()}`}
      className="mt-10 flex items-center justify-between gap-4 border-t pt-6"
    >
      {prev ? (
        <Button variant="outline" asChild>
          <Link to={`/run/${prev.id}`} title={prev.title}>
            <ArrowLeft /> {noun} trước
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">
        {noun} {index + 1}/{exercises.length}
      </span>
      {next ? (
        <Button asChild>
          <Link to={`/run/${next.id}`} title={next.title}>
            {noun} tiếp theo <ArrowRight />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  )
}

