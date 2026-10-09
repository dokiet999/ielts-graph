import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Headphones,
  ListChecks,
  PlayCircle,
  ScrollText,
  Search,
} from 'lucide-react'
import { SectionLabel } from '@/components/PageHeading'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { CourseCard } from '@/features/courses/CourseCard'
import { errorMessage } from '@/lib/api'
import { formatBand } from '@/lib/band'
import { useDashboard, useMyCourses, useMySubmissions } from '@/lib/queries'
import { formatDateTime, percent, SKILL_LABEL } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { answeredCount, useSessionStore } from '@/stores/session'

function Stat({ icon: Icon, children }: { icon: typeof BookOpen; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm">
      <Icon className="size-4 text-muted-foreground" />
      <span>{children}</span>
    </div>
  )
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <b className="font-semibold text-success">{children}</b>
}

function ProgressOverview() {
  const { data, isLoading } = useDashboard()
  if (isLoading || !data) return <Skeleton className="h-44" />
  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
          <BookOpen className="size-7" />
        </div>
        <div className="flex-1">
          <p className="text-lg font-semibold">
            Bạn đã học xong {data.completedCourseCount} / {data.courseCount} khóa học
          </p>
          <p className="text-sm text-muted-foreground">
            Tiếp tục luyện tập đều đặn để cải thiện band điểm nhé!
          </p>
        </div>
        <Link
          to="/courses?tab=completed"
          className="hidden items-center gap-1 text-sm font-medium text-info hover:underline sm:flex"
        >
          Khóa đã hoàn thành <ChevronRight className="size-4" />
        </Link>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Stat icon={ListChecks}>
          Luyện tập <Highlight>{data.exercisesDone}</Highlight> bài
        </Stat>
        <Stat icon={ScrollText}>
          Đã nộp <Highlight>{data.submissionCount}</Highlight> lượt
        </Stat>
        <Stat icon={BookOpen}>
          Band Reading ước lượng <Highlight>{formatBand(data.readingBand)}</Highlight>
        </Stat>
        <Stat icon={Headphones}>
          Band Listening ước lượng <Highlight>{formatBand(data.listeningBand)}</Highlight>
        </Stat>
      </div>
    </div>
  )
}

function ContinueWorking() {
  const sessions = useSessionStore((s) => s.sessions)
  const drafts = Object.entries(sessions)
    .filter(([, s]) => s.title && answeredCount(s) > 0)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
    .slice(0, 3)
  if (!drafts.length) return null
  return (
    <section>
      <SectionLabel>Tiếp tục làm bài</SectionLabel>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {drafts.map(([id, s]) => (
          <Link key={id} to={`/run/${id}`} className="card flex flex-col gap-3 p-4 hover:shadow-md">
            <div className="flex items-start gap-3">
              <PlayCircle className="mt-0.5 size-5 shrink-0 text-info" />
              <p className="line-clamp-2 text-sm font-medium">{s.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <ProgressBar value={answeredCount(s)} max={s.questionCount} tone="info" />
              <span className="shrink-0 text-xs text-muted-foreground">
                {answeredCount(s)}/{s.questionCount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function ActiveCourses() {
  const { data, isLoading, error, refetch } = useMyCourses()
  const active = data?.filter((c) => c.enrollmentStatus === 'IN_PROGRESS') ?? []
  return (
    <section>
      <SectionLabel
        action={
          <Link to="/courses" className="text-sm font-medium text-info hover:underline">
            Xem tất cả
          </Link>
        }
      >
        Khóa đang học
      </SectionLabel>
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : active.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Bạn đang không theo học khóa học nào."
          className="bg-surface"
          action={
            <Button variant="link" asChild>
              <Link to="/courses">Xem danh sách khóa học</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {active.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </section>
  )
}

function ProfileCard() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  const fields = [user.fullName, user.phone, user.bio, user.avatarUrl]
  const pct = percent(fields.filter(Boolean).length, fields.length)
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-semibold leading-snug">Hoàn thành thông tin hồ sơ của bạn</p>
        <Avatar name={user.fullName} src={user.avatarUrl} className="size-12" />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={pct} tone="info" />
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <Link
        to="/profile"
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-info hover:underline"
      >
        Hồ sơ của bạn <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

function RecentSubmissions() {
  const { data } = useMySubmissions()
  const recent = data?.slice(0, 4) ?? []
  return (
    <div className="card p-5">
      <p className="text-lg font-semibold">Bài làm gần đây</p>
      {recent.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Bạn chưa nộp bài nào.</p>
      ) : (
        <ul className="mt-3 divide-y">
          {recent.map((s) => (
            <li key={s.id}>
              <Link to={`/submissions/${s.id}`} className="block py-3 hover:text-primary">
                <p className="line-clamp-1 text-sm font-medium">{s.exerciseTitle}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone={s.skillType === 'READING' ? 'primary' : 'info'}>
                    {SKILL_LABEL[s.skillType]}
                  </Badge>
                  <span>
                    {s.correctCount}/{s.questionCount} câu
                  </span>
                  <span>· {formatDateTime(s.submittedAt)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/history"
        className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-info hover:underline"
      >
        Xem lịch sử <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

export function HomePage() {
  const user = useAuthStore((s) => s.user)
  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xin chào, {user?.fullName} 👋</h1>
          <p className="mt-1 text-muted-foreground">Hôm nay bạn muốn luyện kỹ năng nào?</p>
        </div>
        <section>
          <SectionLabel>Xem nhanh quá trình học của bạn</SectionLabel>
          <ProgressOverview />
        </section>
        <ContinueWorking />
        <ActiveCourses />
      </div>
      <aside className="space-y-5">
        <ProfileCard />
        <RecentSubmissions />
      </aside>
    </div>
  )
}
