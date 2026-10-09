import { Link } from 'react-router-dom'
import { ArrowRight, Flame } from 'lucide-react'
import { CoursePageHeader } from '@/layouts/CourseLayout'
import { useCourseContext } from '@/layouts/courseContext'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressRing } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/states'
import { useSectionExercises } from '@/lib/queries'
import { percent } from '@/lib/utils'
import { ExerciseCard } from './ExerciseCard'
import { useExerciseStats } from './exerciseStatus'

export function OverviewPage() {
  const { course, section } = useCourseContext()
  const { data, isLoading } = useSectionExercises(section.id)
  const { statuses, done } = useExerciseStats(data)
  const list = data ?? []

  const bySkill = (skill: string) => {
    const items = list.filter((e) => e.skillType === skill)
    return { total: items.length, done: items.filter((e) => e.attemptCount > 0).length }
  }
  const reading = bySkill('READING')
  const listening = bySkill('LISTENING')
  const attempted = list.filter((e) => e.bestScore !== null)
  const avgPct = attempted.length
    ? Math.round(
        attempted.reduce((s, e) => s + percent(e.bestScore ?? 0, e.maxScore), 0) / attempted.length,
      )
    : 0
  const finished = list.length > 0 && done === list.length
  const next = list.filter((_, i) => statuses[i] !== 'done').slice(0, 2)

  return (
    <div>
      <CoursePageHeader title="Overview">
        <Badge tone={finished ? 'outline' : 'info'} className="px-3 py-1 text-sm">
          {finished ? 'Completed' : 'In progress'}
        </Badge>
      </CoursePageHeader>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="font-semibold">Giai đoạn</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {section.title}
            {section.description && <> — {section.description}</>}
          </p>
        </div>
        <div>
          <p className="font-semibold">Nội dung</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {section.lessons.length} bài học · {section.exerciseCount} bài luyện
          </p>
        </div>
        <div>
          <p className="font-semibold">Giáo viên</p>
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

      <div className="mt-8 flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary-soft p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface">
          <Flame className="size-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold">
            {finished
              ? 'Bạn đã hoàn thành giai đoạn này!'
              : 'Làm bài luyện mỗi ngày để giữ nhịp học'}
          </p>
          <p className="text-sm text-primary">
            {finished
              ? 'Làm lại các bài để cải thiện điểm số hoặc chuyển sang giai đoạn tiếp theo.'
              : 'Chăm chỉ làm bài mỗi ngày để tiến bộ nhanh hơn nhé!'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <ProgressRing value={done} max={list.length} label="Bài luyện" caption="Đã hoàn thành" />
          <ProgressRing
            value={reading.done}
            max={reading.total}
            label="Reading"
            caption="Bài đã làm"
          />
          <ProgressRing
            value={listening.done}
            max={listening.total}
            label="Listening"
            caption="Bài đã làm"
          />
          <ProgressRing
            value={avgPct}
            max={100}
            display={`${avgPct}%`}
            label="Điểm trung bình"
            caption="Theo best score"
          />
        </div>
      )}

      {next.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="border-l-4 border-info pl-3 text-xl font-semibold">Làm tiếp</h2>
            <Button variant="link" asChild>
              <Link to="../exercises">
                Tất cả bài luyện <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {next.map((e) => (
              <ExerciseCard key={e.id} exercise={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
