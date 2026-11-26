import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  GraduationCap,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProgressBar } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { SCHEDULE_STATUS_META } from '@/lib/moderation'
import { useTeacherCourseStudents } from '@/lib/queries'
import type { ScheduleStatus } from '@/lib/types'
import { formatDate, formatDateTime } from '@/lib/utils'

const SCHEDULE_OPTIONS: ScheduleStatus[] = [
  'ON_TRACK',
  'BEHIND',
  'INACTIVE',
  'PRE_ENROLLED',
  'COMPLETED',
]

export function TeacherCourseStudentsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [scheduleStatus, setScheduleStatus] = useState<string>('')

  const overview = useTeacherCourseStudents(courseId, {
    q: appliedSearch,
    scheduleStatus,
  })

  if (overview.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (overview.error || !overview.data) {
    return (
      <ErrorState
        message={overview.error ? errorMessage(overview.error) : 'Không thể tải danh sách học viên.'}
        onRetry={() => overview.refetch()}
      />
    )
  }

  const data = overview.data
  const capacityLabel = data.maxStudents
    ? `${data.activeStudentCount} / ${data.maxStudents}`
    : `${data.activeStudentCount} (Không giới hạn)`

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/teacher/courses/${data.courseId}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại khóa học
        </Link>
        <PageTitle
          title={`Học viên & Tiến độ — ${data.courseTitle}`}
          subtitle="Theo dõi sĩ số, tiến độ làm bài, cấp quyền mở Final Test và chấm nhận xét bài nộp của từng học viên."
        />
        {(data.startDate || data.endDate) && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            Thời gian khóa học: {formatDate(data.startDate)} → {formatDate(data.endDate)}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card flex items-center gap-4 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sĩ số lớp</p>
            <p className="mt-0.5 text-xl font-bold">{capacityLabel}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tiến độ trung bình</p>
            <p className="mt-0.5 text-xl font-bold">{data.averageProgressPercent}%</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Đã hoàn thành</p>
            <p className="mt-0.5 text-xl font-bold">{data.completedCount}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Chậm / Ngưng hoạt động</p>
            <p className="mt-0.5 text-xl font-bold">{data.behindOrInactiveCount}</p>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedSearch(searchInput)
        }}
        className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên, email hoặc tên đăng nhập..."
            aria-label="Tìm học viên trong khóa"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Lọc trạng thái tiến độ"
          value={scheduleStatus}
          onChange={(e) => setScheduleStatus(e.target.value)}
          className="sm:w-64"
        >
          <option value="">Tất cả trạng thái tiến độ</option>
          {SCHEDULE_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {SCHEDULE_STATUS_META[st].label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Tìm kiếm
        </Button>
      </form>

      {data.students.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Chưa có học viên nào khớp bộ lọc"
          description="Khi học viên ghi danh hoặc đặt giữ chỗ khóa học, tiến độ của họ sẽ hiển thị tại đây."
          className="bg-surface"
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Học viên</th>
                <th className="px-4 py-3.5 font-semibold">Ngày ghi danh</th>
                <th className="px-4 py-3.5 font-semibold">Tiến độ bài tập</th>
                <th className="px-4 py-3.5 font-semibold">Điểm TB</th>
                <th className="px-4 py-3.5 font-semibold">Lần nộp gần nhất</th>
                <th className="px-4 py-3.5 font-semibold">Trạng thái</th>
                <th className="px-5 py-3.5 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.students.map((student) => {
                const statusMeta =
                  SCHEDULE_STATUS_META[student.scheduleStatus] ?? SCHEDULE_STATUS_META.ON_TRACK
                return (
                  <tr key={student.studentId} className="hover:bg-muted/20">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.fullName} className="size-9" />
                        <div className="min-w-0">
                          <p className="font-semibold">{student.fullName}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(student.enrolledAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="w-40 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>
                            {student.completedExercises}/{student.totalExercises} bài
                          </span>
                          <span className="font-semibold">{student.progressPercent}%</span>
                        </div>
                        <ProgressBar value={student.progressPercent} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <span className="font-semibold">
                          {student.averageScore !== null ? `${student.averageScore}%` : '—'}
                        </span>
                        {student.pendingReviewCount > 0 && (
                          <p className="text-xs font-medium text-warning">
                            {student.pendingReviewCount} bài chờ nhận xét
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
                      {student.lastSubmittedAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3.5" /> {formatDateTime(student.lastSubmittedAt)}
                        </span>
                      ) : (
                        'Chưa nộp bài'
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/teacher/courses/${data.courseId}/students/${student.studentId}`}>
                          <Eye /> Chi tiết & Final Test
                        </Link>
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
