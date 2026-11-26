import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Info,
  RotateCcw,
  Star,
  Users,
  Video,
  X,
} from 'lucide-react'
import { SectionLabel } from '@/components/PageHeading'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { CONTENT_STATUS_META, SCHEDULE_STATUS_META } from '@/lib/moderation'
import {
  useActivateCourse,
  useAdminCourseDetail,
  useAdminCourseStudents,
  useApproveCourse,
  useApproveLesson,
  useDeactivateCourse,
  useRejectCourse,
  useRejectLesson,
  useSetCourseFeatured,
} from '@/lib/queries'
import type { AdminLessonItem } from '@/lib/types'
import { cn, formatDate, formatDateTime, formatMinutes, LEVEL_LABEL, SKILL_LABEL } from '@/lib/utils'
import {
  ApproveContentDialog,
  ConfirmActionDialog,
  ReasonActionDialog,
  RejectContentDialog,
} from './ModerationDialogs'

export function AdminCoursePreviewPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { data: course, isLoading, error, refetch } = useAdminCourseDetail(courseId)
  const courseStudents = useAdminCourseStudents(courseId)

  const approveCourse = useApproveCourse()
  const rejectCourse = useRejectCourse()
  const approveLesson = useApproveLesson()
  const rejectLesson = useRejectLesson()
  const setFeatured = useSetCourseFeatured()
  const deactivateCourse = useDeactivateCourse()
  const activateCourse = useActivateCourse()

  const [approveCourseOpen, setApproveCourseOpen] = useState(false)
  const [rejectCourseOpen, setRejectCourseOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [activateOpen, setActivateOpen] = useState(false)
  const [approveLessonTarget, setApproveLessonTarget] = useState<AdminLessonItem | null>(null)
  const [rejectLessonTarget, setRejectLessonTarget] = useState<AdminLessonItem | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <ErrorState
        message={error ? errorMessage(error) : 'Không tìm thấy khóa học.'}
        onRetry={() => refetch()}
      />
    )
  }

  const courseStatus = CONTENT_STATUS_META[course.status]

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin/reviews"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách kiểm duyệt
        </Link>

        <div className="card p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={courseStatus.tone}>{courseStatus.label}</Badge>
                {course.isFeatured && (
                  <Badge tone="warning">
                    <Star /> Nổi bật
                  </Badge>
                )}
                {course.skillFocus && <Badge tone="info">{SKILL_LABEL[course.skillFocus]}</Badge>}
                {course.difficultyLevel && (
                  <Badge tone="neutral">{LEVEL_LABEL[course.difficultyLevel]}</Badge>
                )}
                {course.categoryName && <Badge tone="neutral">{course.categoryName}</Badge>}
                {!course.isActive && <Badge tone="danger">Đang ẩn</Badge>}
              </div>

              <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{course.title}</h1>
              {course.description && <p className="max-w-3xl text-muted-foreground">{course.description}</p>}

              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Giảng viên: <strong className="text-foreground">{course.teacherName}</strong>
                </span>
                <span>{course.totalLessons} bài học</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-4" />
                  {course.maxStudents
                    ? `${course.enrollmentCount ?? 0}/${course.maxStudents} học viên`
                    : `${course.enrollmentCount ?? 0} học viên`}
                </span>
                {(course.startDate || course.endDate) && (
                  <span>
                    Lịch: {formatDate(course.startDate)} → {formatDate(course.endDate)}
                  </span>
                )}
                {course.estimatedDuration && <span>{formatMinutes(course.estimatedDuration)}</span>}
                {course.submittedAt && <span>Gửi duyệt: {formatDateTime(course.submittedAt)}</span>}
                {course.publishedAt && <span>Xuất bản: {formatDateTime(course.publishedAt)}</span>}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {course.status === 'PENDING_REVIEW' && (
                <>
                  <Button
                    variant="success"
                    onClick={() => {
                      approveCourse.reset()
                      setApproveCourseOpen(true)
                    }}
                  >
                    <Check /> Phê duyệt khóa học
                  </Button>
                  <Button
                    variant="dangerSoft"
                    onClick={() => {
                      rejectCourse.reset()
                      setRejectCourseOpen(true)
                    }}
                  >
                    <X /> Từ chối
                  </Button>
                </>
              )}
              {course.status === 'APPROVED' && course.isActive && (
                <Button
                  variant={course.isFeatured ? 'soft' : 'outline'}
                  disabled={setFeatured.isPending}
                  onClick={() =>
                    setFeatured.mutate({ id: course.id, featured: !course.isFeatured })
                  }
                >
                  <Star /> {course.isFeatured ? 'Bỏ nổi bật' : 'Gắn nổi bật'}
                </Button>
              )}
              {course.isActive ? (
                <Button
                  variant="dangerSoft"
                  onClick={() => {
                    deactivateCourse.reset()
                    setDeactivateOpen(true)
                  }}
                >
                  <EyeOff /> Tạm ẩn
                </Button>
              ) : (
                <Button
                  variant="success"
                  onClick={() => {
                    activateCourse.reset()
                    setActivateOpen(true)
                  }}
                >
                  <RotateCcw /> Mở lại
                </Button>
              )}
            </div>
          </div>

          {!course.isActive && course.deactivationReason && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              <EyeOff className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Khóa học đang bị tạm ẩn</p>
                <p className="mt-0.5">{course.deactivationReason}</p>
              </div>
            </div>
          )}

          {course.reviewNote && (
            <div
              className={cn(
                'mt-5 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm',
                course.status === 'REJECTED'
                  ? 'bg-danger-soft text-danger'
                  : 'bg-muted text-foreground',
              )}
            >
              <Info className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">
                  Ghi chú kiểm duyệt
                  {course.reviewedByName ? ` (${course.reviewedByName})` : ''}
                </p>
                <p className="mt-0.5">{course.reviewNote}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <section>
        <SectionLabel>Nội dung chương trình học ({course.totalLessons} bài học)</SectionLabel>

        {course.sections.length === 0 ? (
          <div className="card p-6 text-sm text-muted-foreground">
            Khóa học chưa có chương học nào.
          </div>
        ) : (
          <div className="space-y-4">
            {course.sections.map((section) => (
              <div key={section.id} className="card overflow-hidden">
                <div className="border-b bg-muted/40 px-5 py-4">
                  <h3 className="font-semibold">
                    Chương {section.ordering}: {section.title}
                  </h3>
                  {section.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
                  )}
                </div>

                {section.lessons.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">
                    Chưa có bài học trong chương này.
                  </p>
                ) : (
                  <div className="divide-y">
                    {section.lessons.map((lesson) => {
                      const lessonMeta = CONTENT_STATUS_META[lesson.status]
                      const LessonIcon = lesson.lessonType === 'VIDEO' ? Video : FileText
                      const canReviewLesson =
                        course.status === 'APPROVED' && lesson.status === 'PENDING_REVIEW'

                      return (
                        <div
                          key={lesson.id}
                          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <LessonIcon className="size-4 text-muted-foreground" />
                              <span className="font-medium">
                                {lesson.ordering}. {lesson.title}
                              </span>
                              <Badge tone={lessonMeta.tone}>{lessonMeta.label}</Badge>
                              {lesson.isPreview && <Badge tone="info">Học thử</Badge>}
                            </div>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              <span>Loại: {lesson.lessonType}</span>
                              {lesson.videoDuration && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="size-3.5" />{' '}
                                  {Math.ceil(lesson.videoDuration / 60)} phút
                                </span>
                              )}
                              {lesson.videoUrl && (
                                <a
                                  href={lesson.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-info hover:underline"
                                >
                                  Video <ExternalLink className="size-3" />
                                </a>
                              )}
                              {lesson.documentUrl && (
                                <a
                                  href={lesson.documentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-info hover:underline"
                                >
                                  Tài liệu <ExternalLink className="size-3" />
                                </a>
                              )}
                            </div>

                            {lesson.reviewNote && (
                              <p
                                className={cn(
                                  'rounded-lg px-2.5 py-1.5 text-xs',
                                  lesson.status === 'REJECTED'
                                    ? 'bg-danger-soft text-danger'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                {lesson.reviewNote}
                              </p>
                            )}
                          </div>

                          {canReviewLesson && (
                            <div className="flex shrink-0 gap-2">
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => {
                                  approveLesson.reset()
                                  setApproveLessonTarget(lesson)
                                }}
                              >
                                <Check /> Duyệt bài
                              </Button>
                              <Button
                                size="sm"
                                variant="dangerSoft"
                                onClick={() => {
                                  rejectLesson.reset()
                                  setRejectLessonTarget(lesson)
                                }}
                              >
                                <X /> Từ chối
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionLabel>
          Học viên & Tiến độ ({courseStudents.data?.activeStudentCount ?? course.enrollmentCount ?? 0})
        </SectionLabel>
        {courseStudents.isLoading ? (
          <Skeleton className="h-32" />
        ) : courseStudents.error ? (
          <ErrorState
            message={errorMessage(courseStudents.error)}
            onRetry={() => courseStudents.refetch()}
          />
        ) : !courseStudents.data?.students.length ? (
          <div className="card p-6 text-sm text-muted-foreground">
            Chưa có học viên nào ghi danh vào khóa học này.
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Học viên</th>
                  <th className="px-4 py-3 font-semibold">Ngày ghi danh</th>
                  <th className="px-4 py-3 font-semibold">Tiến độ</th>
                  <th className="px-4 py-3 font-semibold">Điểm TB</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {courseStudents.data.students.map((st) => {
                  const stMeta =
                    SCHEDULE_STATUS_META[st.scheduleStatus] ?? SCHEDULE_STATUS_META.ON_TRACK
                  return (
                    <tr key={st.studentId}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={st.fullName} className="size-8" />
                          <div>
                            <p className="font-medium">{st.fullName}</p>
                            <p className="text-xs text-muted-foreground">{st.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {formatDate(st.enrolledAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>
                              {st.completedExercises}/{st.totalExercises}
                            </span>
                            <span className="font-semibold">{st.progressPercent}%</span>
                          </div>
                          <ProgressBar value={st.progressPercent} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-medium">
                        {st.averageScore !== null ? `${st.averageScore}%` : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={stMeta.tone}>{stMeta.label}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/admin/courses/${course.id}/students/${st.studentId}`}>
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
      </section>

      <ApproveContentDialog
        open={approveCourseOpen}
        onOpenChange={setApproveCourseOpen}
        itemTitle={course.title}
        itemKind="khóa học"
        loading={approveCourse.isPending}
        error={approveCourse.error ? errorMessage(approveCourse.error) : null}
        onConfirm={(note) => {
          approveCourse.mutate(
            { id: course.id, note },
            { onSuccess: () => setApproveCourseOpen(false) },
          )
        }}
      />

      <RejectContentDialog
        open={rejectCourseOpen}
        onOpenChange={setRejectCourseOpen}
        itemTitle={course.title}
        itemKind="khóa học"
        loading={rejectCourse.isPending}
        error={rejectCourse.error ? errorMessage(rejectCourse.error) : null}
        onConfirm={(reason) => {
          rejectCourse.mutate(
            { id: course.id, reason },
            { onSuccess: () => setRejectCourseOpen(false) },
          )
        }}
      />

      <ApproveContentDialog
        open={!!approveLessonTarget}
        onOpenChange={(open) => {
          if (!open) setApproveLessonTarget(null)
        }}
        itemTitle={approveLessonTarget?.title ?? ''}
        itemKind="bài học"
        loading={approveLesson.isPending}
        error={approveLesson.error ? errorMessage(approveLesson.error) : null}
        onConfirm={(note) => {
          if (!approveLessonTarget) return
          approveLesson.mutate(
            { id: approveLessonTarget.id, note },
            { onSuccess: () => setApproveLessonTarget(null) },
          )
        }}
      />

      <RejectContentDialog
        open={!!rejectLessonTarget}
        onOpenChange={(open) => {
          if (!open) setRejectLessonTarget(null)
        }}
        itemTitle={rejectLessonTarget?.title ?? ''}
        itemKind="bài học"
        loading={rejectLesson.isPending}
        error={rejectLesson.error ? errorMessage(rejectLesson.error) : null}
        onConfirm={(reason) => {
          if (!rejectLessonTarget) return
          rejectLesson.mutate(
            { id: rejectLessonTarget.id, reason },
            { onSuccess: () => setRejectLessonTarget(null) },
          )
        }}
      />

      <ReasonActionDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        itemKey={course.id}
        title="Tạm ẩn khóa học"
        description={`Khóa học "${course.title}" sẽ ngừng hiển thị với học viên nhưng giữ nguyên dữ liệu ghi danh và bài làm.`}
        fieldLabel="Lý do tạm ẩn"
        placeholder="Ví dụ: Cần rà soát lại nội dung..."
        submitLabel="Tạm ẩn khóa học"
        loading={deactivateCourse.isPending}
        error={deactivateCourse.error ? errorMessage(deactivateCourse.error) : null}
        onConfirm={(reason) => {
          deactivateCourse.mutate(
            { id: course.id, reason },
            { onSuccess: () => setDeactivateOpen(false) },
          )
        }}
      />

      <ConfirmActionDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        title="Mở lại hiển thị khóa học"
        description={`Khôi phục trạng thái hiển thị cho khóa học "${course.title}"?`}
        confirmLabel="Mở lại khóa học"
        confirmVariant="success"
        loading={activateCourse.isPending}
        error={activateCourse.error ? errorMessage(activateCourse.error) : null}
        onConfirm={() => {
          activateCourse.mutate(course.id, {
            onSuccess: () => setActivateOpen(false),
          })
        }}
      />
    </div>
  )
}
