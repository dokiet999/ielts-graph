import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  Tags,
  UserCheck,
  Users,
} from 'lucide-react'
import { PageTitle, SectionLabel } from '@/components/PageHeading'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import {
  useAdminCourseReviews,
  useAdminLessonReviews,
  useAdminTeachers,
  useApproveTeacher,
} from '@/lib/queries'
import type { TeacherAccount } from '@/lib/types'
import { formatDateTime, SKILL_LABEL } from '@/lib/utils'
import { ConfirmActionDialog } from './ModerationDialogs'

function StatTile({
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
  tone: 'warning' | 'info' | 'primary' | 'success'
}) {
  const toneClass = {
    warning: 'bg-warning-soft text-warning',
    info: 'bg-info-soft text-info',
    primary: 'bg-primary-soft text-primary',
    success: 'bg-success-soft text-success',
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

export function AdminDashboardPage() {
  const courseQueue = useAdminCourseReviews({ status: 'PENDING_REVIEW', page: 1, size: 5 })
  const lessonQueue = useAdminLessonReviews({ status: 'PENDING_REVIEW', page: 1, size: 1 })
  const pendingTeachers = useAdminTeachers({ status: 'PENDING', page: 1, size: 5 })
  const activeTeachers = useAdminTeachers({ status: 'ACTIVE', page: 1, size: 1 })

  const approveTeacher = useApproveTeacher()
  const [approving, setApproving] = useState<TeacherAccount | null>(null)

  return (
    <div className="space-y-8">
      <PageTitle
        title="Bảng điều khiển quản trị"
        subtitle="Theo dõi hàng đợi kiểm duyệt nội dung và quản lý tài khoản giảng viên."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          to="/admin/reviews?type=courses&status=PENDING_REVIEW"
          icon={BookOpen}
          label="Khóa học chờ duyệt"
          value={courseQueue.data?.total}
          tone="warning"
        />
        <StatTile
          to="/admin/reviews?type=lessons&status=PENDING_REVIEW"
          icon={FileText}
          label="Bài học lẻ chờ duyệt"
          value={lessonQueue.data?.total}
          tone="info"
        />
        <StatTile
          to="/admin/teachers?status=PENDING"
          icon={Users}
          label="Giảng viên chờ duyệt"
          value={pendingTeachers.data?.total}
          tone="primary"
        />
        <StatTile
          to="/admin/teachers?status=ACTIVE"
          icon={UserCheck}
          label="Giảng viên hoạt động"
          value={activeTeachers.data?.total}
          tone="success"
        />
      </div>

      <section>
        <SectionLabel>Quản lý nhanh</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/admin/courses"
            className="card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
                <BookOpen className="size-5" />
              </div>
              <div>
                <p className="font-semibold">Quản lý khóa học</p>
                <p className="text-xs text-muted-foreground">Nổi bật & tạm ẩn khóa học</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            to="/admin/categories"
            className="card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Tags className="size-5" />
              </div>
              <div>
                <p className="font-semibold">Quản lý danh mục</p>
                <p className="text-xs text-muted-foreground">Phân loại & sắp xếp hiển thị</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            to="/admin/students"
            className="card flex items-center justify-between gap-3 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <p className="font-semibold">Quản lý học viên</p>
                <p className="text-xs text-muted-foreground">Khóa / mở khóa tài khoản</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionLabel
            action={
              <Link
                to="/admin/reviews?type=courses&status=PENDING_REVIEW"
                className="text-sm font-medium text-info hover:underline"
              >
                Xem hàng đợi
              </Link>
            }
          >
            Khóa học chờ duyệt lâu nhất
          </SectionLabel>

          {courseQueue.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : courseQueue.error ? (
            <ErrorState
              message={errorMessage(courseQueue.error)}
              onRetry={() => courseQueue.refetch()}
            />
          ) : !courseQueue.data?.items.length ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Không có khóa học nào đang chờ duyệt"
              className="bg-surface py-10"
            />
          ) : (
            <div className="space-y-3">
              {courseQueue.data.items.map((item) => (
                <Link
                  key={item.id}
                  to={`/admin/courses/${item.id}`}
                  className="card flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.skillFocus && <Badge tone="info">{SKILL_LABEL[item.skillFocus]}</Badge>}
                      <Badge tone={item.waitingDays > 0 ? 'warning' : 'neutral'}>
                        <Clock /> {item.waitingDays > 0 ? `Chờ ${item.waitingDays} ngày` : 'Mới gửi'}
                      </Badge>
                      {typeof item.pendingLessonCount === 'number' && (
                        <span className="text-xs text-muted-foreground">
                          {item.pendingLessonCount} bài học chờ duyệt
                        </span>
                      )}
                    </div>
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Giảng viên: {item.teacherName}
                      {item.submittedAt ? ` · Gửi lúc ${formatDateTime(item.submittedAt)}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionLabel
            action={
              <Link
                to="/admin/teachers?status=PENDING"
                className="text-sm font-medium text-info hover:underline"
              >
                Quản lý giảng viên
              </Link>
            }
          >
            Giảng viên chờ phê duyệt
          </SectionLabel>

          {pendingTeachers.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : pendingTeachers.error ? (
            <ErrorState
              message={errorMessage(pendingTeachers.error)}
              onRetry={() => pendingTeachers.refetch()}
            />
          ) : !pendingTeachers.data?.items.length ? (
            <EmptyState
              icon={UserCheck}
              title="Không có tài khoản giảng viên chờ duyệt"
              className="bg-surface py-10"
            />
          ) : (
            <div className="space-y-3">
              {pendingTeachers.data.items.map((teacher) => (
                <div key={teacher.id} className="card flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={teacher.fullName} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{teacher.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{teacher.username} · {teacher.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => {
                      approveTeacher.reset()
                      setApproving(teacher)
                    }}
                  >
                    Phê duyệt
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmActionDialog
        open={!!approving}
        onOpenChange={(open) => {
          if (!open) setApproving(null)
        }}
        title="Phê duyệt tài khoản giảng viên"
        description={
          approving
            ? `Kích hoạt tài khoản giảng viên "${approving.fullName}" (@${approving.username})?`
            : ''
        }
        confirmLabel="Phê duyệt"
        confirmVariant="success"
        loading={approveTeacher.isPending}
        error={approveTeacher.error ? errorMessage(approveTeacher.error) : null}
        onConfirm={() => {
          if (!approving) return
          approveTeacher.mutate(approving.id, {
            onSuccess: () => setApproving(null),
          })
        }}
      />
    </div>
  )
}
