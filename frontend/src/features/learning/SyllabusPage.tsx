import { Link } from 'react-router-dom'
import { ChevronRight, FileText, ListChecks, PlayCircle } from 'lucide-react'
import { CoursePageHeader } from '@/layouts/CourseLayout'
import { useCourseContext } from '@/layouts/courseContext'
import { EmptyState } from '@/components/ui/states'
import type { LessonSummary } from '@/lib/types'

const LESSON_ICON: Record<LessonSummary['lessonType'], typeof PlayCircle> = {
  VIDEO: PlayCircle,
  DOCUMENT: FileText,
  TEXT: FileText,
}

export function SyllabusPage() {
  const { section } = useCourseContext()
  const lessons = [...section.lessons].sort((a, b) => a.ordering - b.ordering)

  return (
    <div>
      <CoursePageHeader title="Bài học" />
      {lessons.length === 0 ? (
        <EmptyState title="Giai đoạn này chưa có bài học." />
      ) : (
        <ol className="space-y-3">
          {lessons.map((lesson, i) => {
            const Icon = LESSON_ICON[lesson.lessonType]
            return (
              <li key={lesson.id}>
                <Link
                  to={`../lessons/${lesson.id}`}
                  className="card group flex items-center gap-4 p-5 transition-shadow hover:shadow-md"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium group-hover:text-primary">{lesson.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Icon className="size-4" />
                        {lesson.lessonType === 'VIDEO'
                          ? `Video${lesson.videoDuration ? ` · ${Math.round(lesson.videoDuration / 60)} phút` : ''}`
                          : 'Tài liệu'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="size-4" /> {lesson.exerciseCount} bài luyện
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
