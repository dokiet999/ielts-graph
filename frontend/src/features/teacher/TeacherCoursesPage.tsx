import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  Archive,
  BookOpen,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { ConfirmActionDialog } from '@/features/admin/ModerationDialogs'
import { errorMessage } from '@/lib/api'
import { CONTENT_STATUS_META } from '@/lib/moderation'
import {
  useArchiveCourse,
  useDeleteCourse,
  useSubmitCourse,
  useTeacherCourses,
  useWithdrawCourse,
} from '@/lib/queries'
import type { ContentStatus, TeacherCourseSummary } from '@/lib/types'
import { cn, formatDateTime, LEVEL_LABEL, SKILL_LABEL } from '@/lib/utils'
import { CourseFormDialog } from './CourseFormDialog'

const TABS: { key: ContentStatus | ''; label: string }[] = [
  { key: '', label: 'Tất cả' },
  { key: 'DRAFT', label: 'Bản nháp' },
  { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'REJECTED', label: 'Bị từ chối' },
]

const VALID_STATUSES: ContentStatus[] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED']

export function TeacherCoursesPage() {
  const [params, setParams] = useSearchParams()
  const rawStatus = params.get('status') as ContentStatus | null
  const status: ContentStatus | '' =
    rawStatus && VALID_STATUSES.includes(rawStatus) ? rawStatus : ''
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const courses = useTeacherCourses({ status, page, size: 10 })
  const submitCourse = useSubmitCourse()
  const withdrawCourse = useWithdrawCourse()
  const archiveCourse = useArchiveCourse()
  const deleteCourse = useDeleteCourse()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TeacherCourseSummary | null>(null)
  const [submitTarget, setSubmitTarget] = useState<TeacherCourseSummary | null>(null)
  const [withdrawTarget, setWithdrawTarget] = useState<TeacherCourseSummary | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<TeacherCourseSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeacherCourseSummary | null>(null)

  const updateParams = (next: { status?: ContentStatus | ''; page?: number }) => {
    const mergedStatus = next.status !== undefined ? next.status : status
    const mergedPage = next.page ?? 1
    const nextParams = new URLSearchParams()
    if (mergedStatus) nextParams.set('status', mergedStatus)
    if (mergedPage > 1) nextParams.set('page', String(mergedPage))
    setParams(nextParams)
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Khóa học của tôi"
          subtitle="Tạo khóa học mới, quản lý chương/bài học, gửi duyệt và theo dõi phản hồi."
        />
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 self-start">
          <Plus /> Tạo khóa học
        </Button>
      </div>

      <div role="tablist" className="mb-6 inline-flex flex-wrap rounded-xl bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.key || 'ALL'}
            type="button"
            role="tab"
            aria-selected={status === t.key}
            onClick={() => updateParams({ status: t.key, page: 1 })}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              status === t.key
                ? 'bg-surface shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {courses.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : courses.error ? (
        <ErrorState message={errorMessage(courses.error)} onRetry={() => courses.refetch()} />
      ) : !courses.data?.items.length ? (
        <EmptyState
          icon={BookOpen}
          title={
            status
              ? `Không có khóa học nào ở trạng thái "${CONTENT_STATUS_META[status].label}"`
              : 'Bạn chưa phụ trách khóa học nào'
          }
          description="Nhấn “Tạo khóa học” để bắt đầu soạn chương trình học mới."
          className="bg-surface"
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {courses.data.items.map((course) => {
              const meta = CONTENT_STATUS_META[course.status]
              const isPending = course.status === 'PENDING_REVIEW'
              const canSubmit =
                course.isActive && (course.status === 'DRAFT' || course.status === 'REJECTED')
              const canDelete =
                (course.status === 'DRAFT' || course.status === 'REJECTED') && !course.publishedAt
              const canArchive = course.status === 'APPROVED' && course.isActive

              return (
                <article key={course.id} className="card flex flex-col justify-between p-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {course.skillFocus && (
                        <Badge tone="info">{SKILL_LABEL[course.skillFocus]}</Badge>
                      )}
                      {course.difficultyLevel && (
                        <Badge tone="neutral">{LEVEL_LABEL[course.difficultyLevel]}</Badge>
                      )}
                      {course.categoryName && (
                        <span className="text-xs text-muted-foreground">{course.categoryName}</span>
                      )}
                      {!course.isActive && <Badge tone="danger">Đang ẩn</Badge>}
                    </div>

                    <h3 className="mt-3 text-lg font-bold">{course.title}</h3>
                    {course.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        {course.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{course.totalLessons} bài học</span>
                      {course.pendingLessonCount > 0 && (
                        <span className="font-medium text-warning">
                          {course.pendingLessonCount} bài đang chờ duyệt
                        </span>
                      )}
                      {course.submittedAt && (
                        <span>Gửi duyệt: {formatDateTime(course.submittedAt)}</span>
                      )}
                      {course.publishedAt && (
                        <span>Xuất bản: {formatDateTime(course.publishedAt)}</span>
                      )}
                    </div>

                    {course.status === 'REJECTED' && course.reviewNote && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <strong>Lý do từ chối:</strong> {course.reviewNote}
                        </span>
                      </div>
                    )}

                    {!course.isActive && course.deactivationReason && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <span>
                          <strong>Lý do tạm ẩn:</strong> {course.deactivationReason}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/teacher/courses/${course.id}`}>
                        <Eye /> Xem nội dung
                      </Link>
                    </Button>
                    {!isPending && (
                      <Button size="sm" variant="outline" onClick={() => setEditTarget(course)}>
                        <Pencil /> Chỉnh sửa
                      </Button>
                    )}
                    {isPending && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          withdrawCourse.reset()
                          setWithdrawTarget(course)
                        }}
                      >
                        <RotateCcw /> Rút duyệt
                      </Button>
                    )}
                    {canArchive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          archiveCourse.reset()
                          setArchiveTarget(course)
                        }}
                      >
                        <Archive /> Lưu trữ
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="dangerSoft"
                        onClick={() => {
                          deleteCourse.reset()
                          setDeleteTarget(course)
                        }}
                      >
                        <Trash2 /> Xóa nháp
                      </Button>
                    )}
                    {canSubmit && (
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
                </article>
              )
            })}
          </div>

          <Pagination
            page={courses.data.page}
            totalPages={courses.data.totalPages}
            totalItems={courses.data.total}
            pageSize={courses.data.size}
            itemLabel="khóa học"
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </>
      )}

      <CourseFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      <CourseFormDialog
        course={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      />

      <ConfirmActionDialog
        open={!!submitTarget}
        onOpenChange={(open) => {
          if (!open) setSubmitTarget(null)
        }}
        title={submitTarget?.status === 'REJECTED' ? 'Gửi duyệt lại khóa học' : 'Gửi duyệt khóa học'}
        description={
          submitTarget
            ? `Gửi khóa học "${submitTarget.title}" và các bài học ở trạng thái Bản nháp/Bị từ chối để quản trị viên duyệt?`
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

      <ConfirmActionDialog
        open={!!withdrawTarget}
        onOpenChange={(open) => {
          if (!open) setWithdrawTarget(null)
        }}
        title="Rút yêu cầu duyệt khóa học"
        description={
          withdrawTarget
            ? `Đưa "${withdrawTarget.title}" và các bài học đang chờ duyệt về trạng thái Bản nháp để tiếp tục chỉnh sửa?`
            : ''
        }
        confirmLabel="Xác nhận rút duyệt"
        loading={withdrawCourse.isPending}
        error={withdrawCourse.error ? errorMessage(withdrawCourse.error) : null}
        onConfirm={() => {
          if (!withdrawTarget) return
          withdrawCourse.mutate(withdrawTarget.id, {
            onSuccess: () => setWithdrawTarget(null),
          })
        }}
      />

      <ConfirmActionDialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
        title="Lưu trữ khóa học"
        description={
          archiveTarget
            ? `Ẩn khóa học "${archiveTarget.title}" khỏi danh sách tuyển sinh mới? Dữ liệu học tập của học viên đã ghi danh vẫn được giữ nguyên.`
            : ''
        }
        confirmLabel="Lưu trữ khóa học"
        loading={archiveCourse.isPending}
        error={archiveCourse.error ? errorMessage(archiveCourse.error) : null}
        onConfirm={() => {
          if (!archiveTarget) return
          archiveCourse.mutate(archiveTarget.id, {
            onSuccess: () => setArchiveTarget(null),
          })
        }}
      />

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Xóa khóa học nháp"
        description={
          deleteTarget
            ? `Xóa vĩnh viễn khóa học "${deleteTarget.title}" cùng toàn bộ chương và bài học nháp bên trong?`
            : ''
        }
        confirmLabel="Xóa khóa học"
        confirmVariant="danger"
        loading={deleteCourse.isPending}
        error={deleteCourse.error ? errorMessage(deleteCourse.error) : null}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteCourse.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
      />
    </div>
  )
}
