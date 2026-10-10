import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ExternalLink, FileText } from 'lucide-react'
import { useCourseContext } from '@/layouts/courseContext'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, PageLoader, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { useLesson, useLessonExercises } from '@/lib/queries'
import { ExerciseCard } from './ExerciseCard'

export function LessonPage() {
  const { lessonId } = useParams()
  const { course, section } = useCourseContext()
  const { data: lesson, isLoading, error, refetch } = useLesson(lessonId)
  const exercises = useLessonExercises(lessonId)

  if (isLoading) return <PageLoader />
  if (error || !lesson)
    return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />

  const ordered = [...section.lessons].sort((a, b) => a.ordering - b.ordering)
  const index = ordered.findIndex((l) => l.id === lesson.id)
  const prev = ordered[index - 1]
  const next = ordered[index + 1]

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4">
        <Link to="../syllabus">
          <ArrowLeft /> Danh sách bài học
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        {course.title} · Bài {index + 1}/{ordered.length}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">{lesson.title}</h1>

      <div className="mt-6">
        {lesson.videoUrl ? (
          <video
            key={lesson.videoUrl}
            src={lesson.videoUrl}
            controls
            className="aspect-video w-full rounded-2xl bg-black"
          />
        ) : lesson.documentUrl ? (
          <a
            href={lesson.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="card flex items-center gap-3 p-5 hover:shadow-md"
          >
            <FileText className="size-6 text-primary" />
            <span className="flex-1 font-medium">Mở tài liệu bài học</span>
            <ExternalLink className="size-4 text-muted-foreground" />
          </a>
        ) : (
          <div className="card flex items-center gap-3 p-5 text-sm text-muted-foreground">
            <FileText className="size-5" />
            Bài học này được học trên lớp; hãy làm các bài luyện bên dưới để củng cố kiến thức.
          </div>
        )}
      </div>

      <h2 className="mb-4 mt-10 text-xl font-semibold">Bài luyện của bài học</h2>
      {exercises.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : exercises.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {exercises.data.map((e) => (
            <ExerciseCard key={e.id} exercise={e} />
          ))}
        </div>
      ) : (
        <EmptyState title="Bài học này chưa có bài luyện." />
      )}

      <div className="mt-10 flex justify-between gap-4 border-t pt-6">
        {prev ? (
          <Button variant="outline" asChild>
            <Link to={`../lessons/${prev.id}`}>
              <ArrowLeft /> Bài trước
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button asChild>
            <Link to={`../lessons/${next.id}`}>
              Bài tiếp theo <ArrowRight />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
