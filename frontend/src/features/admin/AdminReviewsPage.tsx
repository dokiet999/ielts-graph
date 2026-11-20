import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Check, ClipboardCheck, Clock, Eye, FileText, X } from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { CONTENT_STATUS_META } from '@/lib/moderation'
import {
  useAdminCourseReviews,
  useAdminLessonReviews,
  useApproveCourse,
  useApproveLesson,
  useRejectCourse,
  useRejectLesson,
} from '@/lib/queries'
import type { ContentStatus, ReviewQueueItem } from '@/lib/types'
import { cn, formatDateTime, SKILL_LABEL } from '@/lib/utils'
import { ApproveContentDialog, RejectContentDialog } from './ModerationDialogs'

const QUEUE_TABS = [
  { key: 'courses', label: 'Khóa học', icon: BookOpen },
  { key: 'lessons', label: 'Bài học lẻ', icon: FileText },
] as const

const STATUS_OPTIONS: ContentStatus[] = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'DRAFT']

export function AdminReviewsPage() {
  const [params, setParams] = useSearchParams()
  const type = params.get('type') === 'lessons' ? 'lessons' : 'courses'
  const rawStatus = params.get('status') as ContentStatus | null
  const status: ContentStatus =
    rawStatus && STATUS_OPTIONS.includes(rawStatus) ? rawStatus : 'PENDING_REVIEW'
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const courseReviews = useAdminCourseReviews({ status, page, size: 10 })
  const lessonReviews = useAdminLessonReviews({ status, page, size: 10 })

  const activeQuery = type === 'courses' ? courseReviews : lessonReviews

  const approveCourse = useApproveCourse()
  const rejectCourse = useRejectCourse()
  const approveLesson = useApproveLesson()
  const rejectLesson = useRejectLesson()

  const [approveTarget, setApproveTarget] = useState<ReviewQueueItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<ReviewQueueItem | null>(null)

  const updateParams = (next: { type?: 'courses' | 'lessons'; status?: ContentStatus; page?: number }) => {
    const mergedType = next.type ?? type
    const mergedStatus = next.status ?? status
    const mergedPage = next.page ?? 1
    const nextParams = new URLSearchParams()
    if (mergedType !== 'courses') nextParams.set('type', mergedType)
    if (mergedStatus !== 'PENDING_REVIEW') nextParams.set('status', mergedStatus)
    if (mergedPage > 1) nextParams.set('page', String(mergedPage))
    setParams(nextParams)
  }

  const isCourseQueue = type === 'courses'
  const approveMutation = isCourseQueue ? approveCourse : approveLesson
  const rejectMutation = isCourseQueue ? rejectCourse : rejectLesson

  return (
    <div>
      <PageTitle
        title="Kiểm duyệt nội dung"
        subtitle="Xem xét và phê duyệt hoặc từ chối khóa học và bài học do giảng viên gửi lên."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" className="inline-flex rounded-xl bg-muted p-1">
          {QUEUE_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={type === key}
              onClick={() => updateParams({ type: key, page: 1 })}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                type === key
                  ? 'bg-surface shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="review-status-filter" className="text-sm font-medium text-muted-foreground">
            Trạng thái:
          </label>
          <Select
            id="review-status-filter"
            aria-label="Lọc theo trạng thái"
            value={status}
            onChange={(e) => updateParams({ status: e.target.value as ContentStatus, page: 1 })}
            className="w-44"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {CONTENT_STATUS_META[s].label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {activeQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : activeQuery.error ? (
        <ErrorState
          message={errorMessage(activeQuery.error)}
          onRetry={() => activeQuery.refetch()}
        />
      ) : !activeQuery.data?.items.length ? (
        <EmptyState
          icon={ClipboardCheck}
          title={
            isCourseQueue
              ? `Không có khóa học nào ở trạng thái "${CONTENT_STATUS_META[status].label}"`
              : `Không có bài học lẻ nào ở trạng thái "${CONTENT_STATUS_META[status].label}"`
          }
          description={
            isCourseQueue
              ? 'Các khóa học giảng viên gửi duyệt sẽ xuất hiện tại đây theo thứ tự gửi sớm nhất.'
              : 'Bài học mới thêm vào các khóa học đã xuất bản sẽ xuất hiện tại đây.'
          }
          className="bg-surface"
        />
      ) : (
        <>
          <div className="space-y-3">
            {activeQuery.data.items.map((item) => {
              const statusMeta = CONTENT_STATUS_META[item.status]
              return (
                <div
                  key={item.id}
                  className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      {item.skillFocus && <Badge tone="info">{SKILL_LABEL[item.skillFocus]}</Badge>}
                      {item.lessonType && <Badge tone="neutral">{item.lessonType}</Badge>}
                      {item.status === 'PENDING_REVIEW' && (
                        <Badge tone={item.waitingDays > 0 ? 'warning' : 'neutral'}>
                          <Clock /> {item.waitingDays > 0 ? `Chờ ${item.waitingDays} ngày` : 'Mới gửi'}
                        </Badge>
                      )}
                      {isCourseQueue && typeof item.pendingLessonCount === 'number' && (
                        <span className="text-xs text-muted-foreground">
                          {item.pendingLessonCount} bài học chờ duyệt
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-semibold">{item.title}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Giảng viên: <span className="font-medium text-foreground">{item.teacherName}</span>
                        {item.courseTitle && (
                          <>
                            {' · '}Khóa:{' '}
                            <Link
                              to={`/admin/courses/${item.courseId}`}
                              className="font-medium text-info hover:underline"
                            >
                              {item.courseTitle}
                            </Link>
                            {item.sectionTitle ? ` (${item.sectionTitle})` : ''}
                          </>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.submittedAt ? `Gửi duyệt: ${formatDateTime(item.submittedAt)}` : 'Chưa gửi duyệt'}
                        {item.reviewedAt ? ` · Duyệt lúc: ${formatDateTime(item.reviewedAt)}` : ''}
                      </p>
                    </div>

                    {item.reviewNote && (
                      <p
                        className={cn(
                          'rounded-xl px-3 py-2 text-xs',
                          item.status === 'REJECTED'
                            ? 'bg-danger-soft text-danger'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <span className="font-semibold">Ghi chú:</span> {item.reviewNote}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {isCourseQueue ? (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/courses/${item.id}`}>
                          <Eye /> Xem & duyệt
                        </Link>
                      </Button>
                    ) : (
                      item.courseId && (
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/courses/${item.courseId}`}>
                            <Eye /> Xem khóa học
                          </Link>
                        </Button>
                      )
                    )}

                    {item.status === 'PENDING_REVIEW' && (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => {
                            approveMutation.reset()
                            setApproveTarget(item)
                          }}
                        >
                          <Check /> Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="dangerSoft"
                          onClick={() => {
                            rejectMutation.reset()
                            setRejectTarget(item)
                          }}
                        >
                          <X /> Từ chối
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination
            page={activeQuery.data.page}
            totalPages={activeQuery.data.totalPages}
            totalItems={activeQuery.data.total}
            pageSize={activeQuery.data.size}
            itemLabel={isCourseQueue ? 'khóa học' : 'bài học'}
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </>
      )}

      <ApproveContentDialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null)
        }}
        itemTitle={approveTarget?.title ?? ''}
        itemKind={isCourseQueue ? 'khóa học' : 'bài học'}
        loading={approveMutation.isPending}
        error={approveMutation.error ? errorMessage(approveMutation.error) : null}
        onConfirm={(note) => {
          if (!approveTarget) return
          approveMutation.mutate(
            { id: approveTarget.id, note },
            { onSuccess: () => setApproveTarget(null) },
          )
        }}
      />

      <RejectContentDialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null)
        }}
        itemTitle={rejectTarget?.title ?? ''}
        itemKind={isCourseQueue ? 'khóa học' : 'bài học'}
        loading={rejectMutation.isPending}
        error={rejectMutation.error ? errorMessage(rejectMutation.error) : null}
        onConfirm={(reason) => {
          if (!rejectTarget) return
          rejectMutation.mutate(
            { id: rejectTarget.id, reason },
            { onSuccess: () => setRejectTarget(null) },
          )
        }}
      />
    </div>
  )
}
