import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, CalendarDays, Users } from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { useCatalogCourses, useMyCourses } from '@/lib/queries'
import { cn, formatDate, LEVEL_LABEL, SKILL_LABEL } from '@/lib/utils'
import { CourseCard } from './CourseCard'

const TABS = [
  { key: 'active', label: 'Đang học' },
  { key: 'completed', label: 'Đã hoàn thành' },
  { key: 'explore', label: 'Khám phá' },
] as const

export function CourseListPage() {
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab')
  const tab = rawTab === 'completed' ? 'completed' : rawTab === 'explore' ? 'explore' : 'active'
  const { data, isLoading, error, refetch } = useMyCourses()
  const catalog = useCatalogCourses()

  const list =
    data?.filter((c) =>
      tab === 'completed'
        ? c.enrollmentStatus === 'COMPLETED'
        : c.enrollmentStatus === 'IN_PROGRESS',
    ) ?? []

  return (
    <div>
      <PageTitle
        title={tab === 'explore' ? 'Khám phá khóa học' : 'Khóa học của tôi'}
        subtitle={
          tab === 'explore'
            ? 'Danh sách khóa học đang mở đăng ký hoặc giữ chỗ.'
            : 'Các khóa bạn đã đăng ký học.'
        }
      />
      <div role="tablist" className="mb-6 inline-flex rounded-xl bg-muted p-1">
        {TABS.map((t) => {
          const count =
            t.key === 'explore'
              ? catalog.data?.total
              : data?.filter((c) =>
                  t.key === 'completed'
                    ? c.enrollmentStatus === 'COMPLETED'
                    : c.enrollmentStatus === 'IN_PROGRESS',
                ).length
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setParams(t.key === 'active' ? {} : { tab: t.key })}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                tab === t.key
                  ? 'bg-surface shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
              {count !== undefined && (
                <span className="ml-1.5 text-muted-foreground">({count})</span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'explore' ? (
        catalog.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : catalog.error ? (
          <ErrorState
            message={errorMessage(catalog.error)}
            onRetry={() => catalog.refetch()}
          />
        ) : !catalog.data?.items.length ? (
          <EmptyState
            icon={BookOpen}
            title="Chưa có khóa học nào được xuất bản."
            className="bg-surface"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {catalog.data.items.map((c) => {
              const now = Date.now()
              const upcoming = Boolean(c.startDate && now < new Date(c.startDate).getTime())
              const ended = Boolean(c.endDate && now > new Date(c.endDate).getTime())
              const full = Boolean(c.maxStudents && c.enrollmentCount >= c.maxStudents)
              return (
                <Link
                  key={c.id}
                  to={`/courses/${c.id}`}
                  className="card group flex flex-col gap-3 p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{SKILL_LABEL[c.skillFocus]}</Badge>
                    <Badge tone="neutral">{LEVEL_LABEL[c.level]}</Badge>
                    {ended ? (
                      <Badge tone="danger">Đã kết thúc</Badge>
                    ) : full ? (
                      <Badge tone="warning">Đã đủ sĩ số</Badge>
                    ) : upcoming ? (
                      <Badge tone="primary">Đang mở giữ chỗ</Badge>
                    ) : (
                      <Badge tone="success">Đang mở đăng ký</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold group-hover:text-primary">{c.title}</h3>
                  {c.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Giảng viên: {c.teacher.fullName}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {c.maxStudents
                        ? `${c.enrollmentCount}/${c.maxStudents} học viên`
                        : `${c.enrollmentCount} học viên`}
                    </span>
                    {(c.startDate || c.endDate) && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" />
                        {formatDate(c.startDate)} → {formatDate(c.endDate)}
                      </span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            tab === 'completed'
              ? 'Bạn chưa hoàn thành khóa học nào.'
              : 'Bạn chưa có khóa học nào đang học.'
          }
          className="bg-surface"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  )
}
