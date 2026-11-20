import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileEdit,
  Plus,
  Send,
} from 'lucide-react'
import { PageTitle, SectionLabel } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { ConfirmActionDialog } from '@/features/admin/ModerationDialogs'
import { errorMessage } from '@/lib/api'
import { CONTENT_STATUS_META } from '@/lib/moderation'
import { useSubmitCourse, useTeacherCourses } from '@/lib/queries'
import type { TeacherCourseSummary } from '@/lib/types'
import { formatDateTime, SKILL_LABEL } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { CourseFormDialog } from './CourseFormDialog'

function KpiTile({
  to,
  icon: Icon,
  label,
  value,
  tone,
}: {
  to: string
  icon: typeof BookOpen
  label: string
  value?: number
  tone: 'primary' | 'success' | 'warning' | 'neutral'
}) {
  const toneClass = {
    primary: 'bg-primary-soft text-primary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    neutral: 'bg-muted text-foreground/80',
  }[tone]

  return (
    <Link to={to} className="card flex items-center gap-4 p-5 transition-shadow hover:shadow-md">
      <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="size-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-bold">{value ?? '—'}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  )
}

export function TeacherDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const allCourses = useTeacherCourses({ status: '', page: 1, size: 5 })
  const approvedCourses = useTeacherCourses({ status: 'APPROVED', page: 1, size: 1 })
  const pendingCourses = useTeacherCourses({ status: 'PENDING_REVIEW', page: 1, size: 1 })
  const rejectedCourses = useTeacherCourses({ status: 'REJECTED', page: 1, size: 5 })
  const draftCourses = useTeacherCourses({ status: 'DRAFT', page: 1, size: 5 })

  const submitCourse = useSubmitCourse()
  const [submitTarget, setSubmitTarget] = useState<TeacherCourseSummary | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const draftAndRejectedCount =
    draftCourses.data !== undefined && rejectedCourses.data !== undefined
      ? draftCourses.data.total + rejectedCourses.data.total
      : undefined

  const actionItems = [
    ...(rejectedCourses.data?.items ?? []),
    ...(draftCourses.data?.items ?? []).filter((c) => c.isActive),
  ].slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title={`Xin chào, ${user?.fullName ?? 'Giảng viên'}`}
          subtitle="Quản lý khóa học của bạn và theo dõi tiến trình kiểm duyệt."
        />
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 self-start">
          <Plus /> Tạo khóa học
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          to="/teacher/courses"
          icon={BookOpen}
          label="Tổng khóa học"
          value={allCourses.data?.total}
          tone="primary"
        />
        <KpiTile
          to="/teacher/courses?status=APPROVED"
          icon={CheckCircle2}
          label="Đã duyệt"
          value={approvedCourses.data?.total}
          tone="success"
        />
        <KpiTile
          to="/teacher/courses?status=PENDING_REVIEW"
          icon={Clock}
          label="Chờ duyệt"
          value={pendingCourses.data?.total}
          tone="warning"
        />
        <KpiTile
          to="/teacher/courses?status=REJECTED"
          icon={FileEdit}
          label="Nháp / Cần sửa"
          value={draftAndRejectedCount}
          tone="neutral"
        />
      </div>

      <section>
        <SectionLabel
          action={
            <Link to="/teacher/courses" className="text-sm font-medium text-info hover:underline">
              Xem tất cả khóa học
            </Link>
          }
        >
          Cần hành động
        </SectionLabel>

        {rejectedCourses.isLoading || draftCourses.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : rejectedCourses.error || draftCourses.error ? (
          <ErrorState
            message={errorMessage(rejectedCourses.error ?? draftCourses.error)}
            onRetry={() => {
              rejectedCourses.refetch()
              draftCourses.refetch()
            }}
          />
        ) : actionItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Không có khóa học nào cần gửi duyệt"
            description="Tất cả khóa học hoạt động của bạn đã được duyệt hoặc đang chờ kiểm duyệt."
            className="bg-surface py-10"
          />
        ) : (
          <div className="space-y-3">
            {actionItems.map((course) => {
              const meta = CONTENT_STATUS_META[course.status]
              return (
                <div
                  key={course.id}
                  className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {course.skillFocus && (
                        <Badge tone="info">{SKILL_LABEL[course.skillFocus]}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {course.totalLessons} bài học
                      </span>
                    </div>
                    <p className="font-semibold">{course.title}</p>
                    {course.status === 'REJECTED' && course.reviewNote && (
                      <div className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <strong>Lý do từ chối:</strong> {course.reviewNote}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/teacher/courses/${course.id}`}>Xem chi tiết</Link>
                    </Button>
                    {course.isActive && (
                      <Button
                        size="sm"
                        onClick={() => {
                          submitCourse.reset()
                          setSubmitTarget(course)
                        }}
                      >
                        <Send /> {course.status === 'REJECTED' ? 'Gửi duyệt lại' : 'Gửi duyệt'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Khóa học gần đây</SectionLabel>
        {allCourses.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : allCourses.error ? (
          <ErrorState
            message={errorMessage(allCourses.error)}
            onRetry={() => allCourses.refetch()}
          />
        ) : !allCourses.data?.items.length ? (
          <EmptyState
            icon={BookOpen}
            title="Bạn chưa phụ trách khóa học nào"
            className="bg-surface py-10"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {allCourses.data.items.map((course) => {
              const meta = CONTENT_STATUS_META[course.status]
              return (
                <Link
                  key={course.id}
                  to={`/teacher/courses/${course.id}`}
                  className="card flex flex-col justify-between gap-3 p-5 transition-shadow hover:shadow-md"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {course.skillFocus && (
                        <Badge tone="info">{SKILL_LABEL[course.skillFocus]}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">{course.title}</h3>
                    {course.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {course.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {course.totalLessons} bài học
                      {course.pendingLessonCount > 0
                        ? ` · ${course.pendingLessonCount} bài chờ duyệt`
                        : ''}
                    </span>
                    <span>
                      {course.submittedAt
                        ? `Gửi: ${formatDateTime(course.submittedAt)}`
                        : 'Chưa gửi duyệt'}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <CourseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => navigate(`/teacher/courses/${created.id}`)}
      />

      <ConfirmActionDialog
        open={!!submitTarget}
        onOpenChange={(open) => {
          if (!open) setSubmitTarget(null)
        }}
        title={submitTarget?.status === 'REJECTED' ? 'Gửi duyệt lại khóa học' : 'Gửi duyệt khóa học'}
        description={
          submitTarget
            ? `Gửi khóa học "${submitTarget.title}" và toàn bộ bài học đang ở trạng thái Bản nháp/Bị từ chối để quản trị viên kiểm duyệt?`
            : ''
        }
        confirmLabel="Gửi duyệt"
        loading={submitCourse.isPending}
        error={submitCourse.error ? errorMessage(submitCourse.error) : null}
        onConfirm={() => {
          if (!submitTarget) return
          submitCourse.mutate(submitTarget.id, {
            onSuccess: () => setSubmitTarget(null),
          })
        }}
      />
    </div>
  )
}
