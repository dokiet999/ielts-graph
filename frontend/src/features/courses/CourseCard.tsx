import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, GraduationCap, ListChecks, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProgressBar } from '@/components/ui/progress'
import type { CourseSummary } from '@/lib/types'
import { formatDate, LEVEL_LABEL, percent } from '@/lib/utils'

export function CourseCard({ course }: { course: CourseSummary }) {
  const pct = percent(course.completedExerciseCount, course.exerciseCount)
  const completed = course.enrollmentStatus === 'COMPLETED'
  return (
    <Link
      to={`/courses/${course.id}`}
      className="card group flex flex-col gap-4 p-6 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug group-hover:text-primary">
          {course.title}
        </h3>
        {completed ? (
          <Badge tone="success" className="shrink-0">
            <CheckCircle2 /> Hoàn thành
          </Badge>
        ) : (
          <Badge tone="info" className="shrink-0">
            Đang học
          </Badge>
        )}
      </div>
      <ul className="space-y-2 text-sm text-foreground/80">
        <li className="flex items-center gap-2">
          <ListChecks className="size-4 text-muted-foreground" />
          Bài luyện: {course.completedExerciseCount}/{course.exerciseCount} bài
        </li>
        <li className="flex items-center gap-2">
          <GraduationCap className="size-4 text-muted-foreground" />
          {LEVEL_LABEL[course.level]} · {course.sectionCount} giai đoạn
        </li>
        <li className="flex items-center gap-2">
          <UserRound className="size-4 text-muted-foreground" />
          {course.teacher.fullName}
        </li>
        <li className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          {completed
            ? `Ngày hoàn thành: ${formatDate(course.completedAt)}`
            : `Ngày bắt đầu: ${formatDate(course.enrolledAt)}`}
        </li>
      </ul>
      <div className="mt-auto flex items-center gap-3">
        <ProgressBar value={pct} />
        <span className="w-10 text-right text-sm font-semibold text-info">{pct}%</span>
      </div>
    </Link>
  )
}
