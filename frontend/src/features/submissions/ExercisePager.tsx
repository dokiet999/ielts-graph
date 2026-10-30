import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSectionExercises } from '@/lib/queries'

export interface ExercisePagerProps {
  sectionId?: string
  exerciseId: string
}

/**
 * Renders Previous / Next exercise navigation buttons for an exercise inside a course section,
 * mirroring the lesson pager in LessonPage.tsx.
 */
export function ExercisePager({ sectionId, exerciseId }: ExercisePagerProps) {
  const { data: exercises } = useSectionExercises(sectionId)

  if (!sectionId || !exercises || exercises.length <= 1) return null

  const index = exercises.findIndex((e) => e.id === exerciseId)
  if (index === -1) return null

  const prev = exercises[index - 1]
  const next = exercises[index + 1]
  if (!prev && !next) return null

  return (
    <nav
      aria-label="Điều hướng bài luyện"
      className="mt-10 flex items-center justify-between gap-4 border-t pt-6"
    >
      {prev ? (
        <Button variant="outline" asChild>
          <Link to={`/run/${prev.id}`} title={prev.title}>
            <ArrowLeft /> Bài luyện trước
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">
        Bài luyện {index + 1}/{exercises.length}
      </span>
      {next ? (
        <Button asChild>
          <Link to={`/run/${next.id}`} title={next.title}>
            Bài luyện tiếp theo <ArrowRight />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  )
}

