import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  ListChecks,
  ListTree,
  UserRound,
  Users,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress'
import { ErrorState, PageLoader } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { useCourse, useEnrollCourse } from '@/lib/queries'
import type { Section } from '@/lib/types'
import { cn, formatDate, formatDateTime, formatMinutes, LEVEL_LABEL, percent } from '@/lib/utils'

function sectionStatus(s: Section) {
  if (s.exerciseCount > 0 && s.completedExerciseCount >= s.exerciseCount) return 'done'
  if (s.completedExerciseCount > 0) return 'active'
  return 'todo'
}

const STATUS = {
  done: { label: 'Hoàn thành', tone: 'success' },
  active: { label: 'Đang học', tone: 'info' },
  todo: { label: 'Chưa bắt đầu', tone: 'neutral' },
} as const

function StageCard({
  courseId,
  section,
  highlight,
}: {
  courseId: string
  section: Section
  highlight?: boolean
}) {
  const status = STATUS[sectionStatus(section)]
  const lessons = section.lessons.length
  return (
    <Link
      to={`/learn/${courseId}/${section.id}/overview`}
      className={cn(
        'card flex flex-col gap-4 p-6 transition-shadow hover:shadow-md',
        highlight && 'border-success/50',
      )}
    >
      <div className="flex flex-wrap gap-2">
        <Badge>Giai đoạn {section.ordering}</Badge>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <div>
        <h3 className="text-xl font-semibold">{section.title}</h3>
        {section.description && (
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
        )}
      </div>
      <ul className="space-y-2 text-sm text-foreground/80">
        <li className="flex items-center gap-2">
          <ListTree className="size-4 text-muted-foreground" /> {lessons} bài học
        </li>
        <li className="flex items-center gap-2">
          <ListChecks className="size-4 text-muted-foreground" />
          {section.completedExerciseCount}/{section.exerciseCount} bài luyện đã làm
        </li>
      </ul>
      <ProgressBar
        className="mt-auto"
        value={percent(section.completedExerciseCount, section.exerciseCount)}
      />
    </Link>
  )
}

export function CourseDetailPage() {
  const { courseId } = useParams()
  const { data: course, isLoading, error, refetch } = useCourse(courseId)
  const enrollMutation = useEnrollCourse()

  if (isLoading) return <PageLoader />
  if (error || !course)
    return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />

  const now = Date.now()
  const isBeforeStart = Boolean(course.startDate && now < new Date(course.startDate).getTime())
  const isEnded = Boolean(course.endDate && now > new Date(course.endDate).getTime())
  const isFull = Boolean(
    course.maxStudents && (course.enrollmentCount ?? 0) >= course.maxStudents,
  )
  const isEnrolled = Boolean(course.enrolledAt)
  const completed = course.enrollmentStatus === 'COMPLETED'
  // The stage to continue: first one not finished, otherwise the last one.
  const current =
    course.sections.find((s) => sectionStatus(s) !== 'done') ??
    course.sections[course.sections.length - 1]

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4">
        <Link to="/courses">
          <ArrowLeft /> Khóa học của tôi
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div>
          {completed && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-success-soft px-4 py-3 text-success">
              <CheckCircle2 className="size-5" />
              Khóa học của bạn đã hoàn thành tất cả giai đoạn
            </div>
          )}
          {isEnrolled && isBeforeStart && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-info-soft px-4 py-3 text-sm text-info">
              <CalendarDays className="size-5 shrink-0" />
              Bạn đã đăng ký giữ chỗ. Khóa học chính thức bắt đầu lúc{' '}
              <b>{formatDateTime(course.startDate!)}</b> — hiện bạn có thể xem trước các bài học thử.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-foreground/80">
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4" /> {course.categoryName}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1.5">
              <GraduationCap className="size-4" /> {LEVEL_LABEL[course.level]}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
            {course.title}
          </h1>
          {course.description && (
            <p className="mt-3 max-w-2xl text-muted-foreground">{course.description}</p>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <CalendarDays className="size-4 text-muted-foreground" /> Thời gian
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {course.startDate
                  ? `Khai giảng: ${formatDate(course.startDate)}`
                  : `Bắt đầu: ${formatDate(course.enrolledAt)}`}
                <br />
                {course.endDate
                  ? `Kết thúc: ${formatDate(course.endDate)}`
                  : completed
                    ? `Hoàn thành: ${formatDate(course.completedAt)}`
                    : 'Đang diễn ra'}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <Clock className="size-4 text-muted-foreground" /> Thời lượng & Sĩ số
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {course.estimatedDuration ? formatMinutes(course.estimatedDuration) : '—'}
                {' · '}
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {course.maxStudents
                    ? `${course.enrollmentCount ?? 0}/${course.maxStudents} học viên`
                    : `${course.enrollmentCount ?? 0} học viên`}
                </span>
                <br />
                {course.sectionCount} giai đoạn · {course.exerciseCount} bài luyện
              </p>
            </div>
            <div>
              <p className="flex items-center gap-2 font-semibold">
                <UserRound className="size-4 text-muted-foreground" /> Giáo viên
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Avatar
                  name={course.teacher.fullName}
                  src={course.teacher.avatarUrl}
                  className="size-9"
                />
                <span className="text-sm">{course.teacher.fullName}</span>
              </div>
            </div>
          </div>
        </div>

        {!isEnrolled ? (
          <div>
            <p className="mb-3 font-semibold uppercase tracking-wide text-primary">
              {isBeforeStart ? 'Đăng ký giữ chỗ' : 'Tham gia khóa học'}
            </p>
            <div className="card space-y-4 border-primary/30 p-6">
              <h3 className="text-xl font-semibold">
                {isEnded
                  ? 'Khóa học đã kết thúc'
                  : isFull
                    ? 'Khóa học đã đủ sĩ số'
                    : isBeforeStart
                      ? 'Mở đăng ký giữ chỗ trước khai giảng'
                      : 'Sẵn sàng vào học ngay'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {course.maxStudents
                  ? `Sĩ số hiện tại: ${course.enrollmentCount ?? 0}/${course.maxStudents} học viên.`
                  : `Hiện có ${course.enrollmentCount ?? 0} học viên đang theo học.`}
              </p>
              {enrollMutation.error && (
                <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                  {errorMessage(enrollMutation.error)}
                </p>
              )}
              <Button
                className="w-full"
                disabled={isEnded || isFull}
                loading={enrollMutation.isPending}
                onClick={() => enrollMutation.mutate(course.id)}
              >
                {isEnded
                  ? 'Đã đóng đăng ký'
                  : isFull
                    ? 'Đã đủ số lượng học viên'
                    : isBeforeStart
                      ? 'Đăng ký giữ chỗ'
                      : 'Đăng ký khóa học'}{' '}
                <ArrowRight />
              </Button>
            </div>
          </div>
        ) : (
          current && (
            <div>
              <p className="mb-3 font-semibold uppercase tracking-wide text-success">
                {completed ? 'Giai đoạn vừa hoàn thành' : 'Giai đoạn hiện tại'}
              </p>
              <div className="card border-success/40 p-6">
                <div className="flex flex-wrap gap-2">
                  <Badge>Giai đoạn {current.ordering}</Badge>
                </div>
                <h3 className="mt-3 text-xl font-semibold">{current.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {current.lessons.length} bài học · {current.completedExerciseCount}/
                  {current.exerciseCount} bài luyện
                </p>
                <Button asChild className="mt-5 w-full">
                  <Link to={`/learn/${course.id}/${current.id}/overview`}>
                    {completed ? 'Xem lại khóa' : 'Vào học'} <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          )
        )}
      </div>

      <div className="my-10 border-t border-dashed" />
      <p className="mb-4 text-muted-foreground">
        Khóa học này có <b className="text-foreground">{course.sections.length}</b> giai đoạn
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {course.sections.map((s) => (
          <StageCard key={s.id} courseId={course.id} section={s} highlight={s.id === current?.id} />
        ))}
      </div>
    </div>
  )
}
