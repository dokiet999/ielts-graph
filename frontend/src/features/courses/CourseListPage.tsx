import { useSearchParams } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { useMyCourses } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { CourseCard } from './CourseCard'

const TABS = [
  { key: 'active', label: 'Đang học' },
  { key: 'completed', label: 'Đã hoàn thành' },
] as const

export function CourseListPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'completed' ? 'completed' : 'active'
  const { data, isLoading, error, refetch } = useMyCourses()
  const list =
    data?.filter((c) =>
      tab === 'completed'
        ? c.enrollmentStatus === 'COMPLETED'
        : c.enrollmentStatus === 'IN_PROGRESS',
    ) ?? []

  return (
    <div>
      <PageTitle title="Khóa học của tôi" subtitle="Các khóa bạn đã đăng ký học." />
      <div role="tablist" className="mb-6 inline-flex rounded-xl bg-muted p-1">
        {TABS.map((t) => {
          const count = data?.filter((c) =>
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

      {isLoading ? (
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
