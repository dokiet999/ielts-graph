import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Info, LayoutDashboard, ListChecks, ListTree } from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { ErrorState, PageLoader } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { useCourse } from '@/lib/queries'
import type { Section } from '@/lib/types'
import { useCourseContext, type CourseContext } from './courseContext'
import { cn } from '@/lib/utils'
import { ThemeToggle } from './UserMenu'

const GROUPS = [
  {
    title: null,
    items: [
      { to: 'overview', label: 'Overview', icon: LayoutDashboard },
      { to: 'syllabus', label: 'Bài học', hint: 'Syllabus theo giai đoạn', icon: ListTree },
    ],
  },
  {
    title: 'Bài tập trong khóa',
    items: [{ to: 'exercises', label: 'Bài luyện', icon: ListChecks }],
  },
  {
    title: 'Thông tin',
    items: [{ to: 'info', label: 'Course info', icon: Info }],
  },
]

const stageLabel = (s: Section) => `Giai đoạn ${s.ordering}`

export function CourseLayout() {
  const { courseId, sectionId } = useParams()
  const navigate = useNavigate()
  const { data: course, isLoading, error, refetch } = useCourse(courseId)

  if (isLoading) return <PageLoader />
  if (error || !course) {
    return (
      <div className="p-6">
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </div>
    )
  }
  const section = course.sections.find((s) => s.id === sectionId) ?? course.sections[0]

  return (
    <div className="min-h-full bg-surface">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-surface px-4 lg:px-6">
        <Button variant="outline" size="icon" asChild aria-label="Quay lại khóa học">
          <Link to={`/courses/${course.id}`}>
            <ArrowLeft />
          </Link>
        </Button>
        <Link to="/" className="hidden sm:block" aria-label="Trang chủ">
          <LogoMark />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="soft" size="sm" className="bg-muted text-foreground hover:bg-muted/70">
              {stageLabel(section)} <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {course.sections.map((s) => (
              <DropdownMenuItem
                key={s.id}
                onSelect={() => navigate(`/learn/${course.id}/${s.id}/overview`)}
                className={cn(s.id === section.id && 'font-semibold text-primary')}
              >
                {stageLabel(s)} · {s.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{course.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {stageLabel(section)} - {section.title}
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside className="border-b lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-1 lg:p-5">
            {GROUPS.map((group) => (
              <div key={group.title ?? 'main'} className="flex gap-1 lg:block lg:space-y-1">
                {group.title && (
                  <p className="hidden px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">
                    {group.title}
                  </p>
                )}
                {group.items.map(({ to, label, icon: Icon, ...rest }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors',
                        isActive
                          ? 'bg-primary-soft font-medium text-primary'
                          : 'text-foreground/80 hover:bg-muted',
                      )
                    }
                  >
                    <Icon className="size-5 shrink-0" />
                    <span>
                      <span className="block">{label}</span>
                      {'hint' in rest && (
                        <span className="hidden text-xs text-muted-foreground lg:block">
                          {rest.hint}
                        </span>
                      )}
                    </span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-4xl">
            <Outlet context={{ course, section } satisfies CourseContext} />
          </div>
        </main>
      </div>
    </div>
  )
}

/** Breadcrumb-style heading used by pages inside a course. */
export function CoursePageHeader({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  const { course, section } = useCourseContext()
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">
          {stageLabel(section)} - {section.title} - {course.title}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
      </div>
      {children}
    </div>
  )
}
