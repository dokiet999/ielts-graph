import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Info,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Users,
  Video,
} from 'lucide-react'
import { SectionLabel } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { ConfirmActionDialog } from '@/features/admin/ModerationDialogs'
import { errorMessage } from '@/lib/api'
import { CONTENT_STATUS_META } from '@/lib/moderation'
import {
  useArchiveCourse,
  useDeleteCourse,
  useDeleteLesson,
  useDeleteSection,
  useSubmitCourse,
  useSubmitLesson,
  useTeacherCourseDetail,
  useWithdrawCourse,
  useWithdrawLesson,
} from '@/lib/queries'
import type { AdminLessonItem, AdminSectionItem } from '@/lib/types'
import { cn, formatDate, formatDateTime, formatMinutes, LEVEL_LABEL, SKILL_LABEL } from '@/lib/utils'
import { CourseFormDialog } from './CourseFormDialog'
import { LessonFormDialog } from './LessonFormDialog'
import { SectionFormDialog } from './SectionFormDialog'

export function TeacherCourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { data: course, isLoading, error, refetch } = useTeacherCourseDetail(courseId)

  const submitCourse = useSubmitCourse()
  const withdrawCourse = useWithdrawCourse()
  const archiveCourse = useArchiveCourse()
  const deleteCourse = useDeleteCourse()
  const deleteSection = useDeleteSection()
  const submitLesson = useSubmitLesson()
  const withdrawLesson = useWithdrawLesson()
  const deleteLesson = useDeleteLesson()

  const [editCourseOpen, setEditCourseOpen] = useState(false)
  const [confirmCourseOpen, setConfirmCourseOpen] = useState(false)
  const [withdrawCourseOpen, setWithdrawCourseOpen] = useState(false)
  const [archiveCourseOpen, setArchiveCourseOpen] = useState(false)
  const [deleteCourseOpen, setDeleteCourseOpen] = useState(false)

  const [createSectionOpen, setCreateSectionOpen] = useState(false)
  const [editSectionTarget, setEditSectionTarget] = useState<AdminSectionItem | null>(null)
  const [deleteSectionTarget, setDeleteSectionTarget] = useState<AdminSectionItem | null>(null)

  const [createLessonSectionId, setCreateLessonSectionId] = useState<string | null>(null)
  const [editLessonTarget, setEditLessonTarget] = useState<AdminLessonItem | null>(null)
  const [lessonTarget, setLessonTarget] = useState<AdminLessonItem | null>(null)
  const [withdrawLessonTarget, setWithdrawLessonTarget] = useState<AdminLessonItem | null>(null)
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<AdminLessonItem | null>(null)

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
  const isCoursePending = course.status === 'PENDING_REVIEW'
  const canSubmitCourse =
    course.isActive && (course.status === 'DRAFT' || course.status === 'REJECTED')
  const canDeleteCourse =
    (course.status === 'DRAFT' || course.status === 'REJECTED') && !course.publishedAt
  const canArchiveCourse = course.status === 'APPROVED' && course.isActive

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/teacher/courses"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách khóa học
        </Link>

        <div className="card p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={courseStatus.tone}>{courseStatus.label}</Badge>
                {course.skillFocus && <Badge tone="info">{SKILL_LABEL[course.skillFocus]}</Badge>}
                {course.difficultyLevel && (
                  <Badge tone="neutral">{LEVEL_LABEL[course.difficultyLevel]}</Badge>
                )}
                {course.categoryName && <Badge tone="neutral">{course.categoryName}</Badge>}
                {!course.isActive && <Badge tone="danger">Khóa học đang ẩn</Badge>}
              </div>

              <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{course.title}</h1>
              {course.description && (
                <p className="max-w-3xl text-muted-foreground">{course.description}</p>
              )}

              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span>{course.totalLessons} bài học</span>
                <span>
                  {course.maxStudents
                    ? `${course.enrollmentCount ?? 0}/${course.maxStudents} học viên`
                    : `${course.enrollmentCount ?? 0} học viên`}
                </span>
                {(course.startDate || course.endDate) && (
                  <span>
                    Thời gian: {formatDate(course.startDate)} → {formatDate(course.endDate)}
                  </span>
                )}
                {course.estimatedDuration && <span>{formatMinutes(course.estimatedDuration)}</span>}
                {course.submittedAt && <span>Gửi duyệt: {formatDateTime(course.submittedAt)}</span>}
                {course.publishedAt && <span>Xuất bản: {formatDateTime(course.publishedAt)}</span>}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to={`/teacher/courses/${course.id}/students`}>
                  <Users /> Học viên & Tiến độ ({course.enrollmentCount ?? 0})
                </Link>
              </Button>
              {!isCoursePending && (
                <Button variant="outline" onClick={() => setEditCourseOpen(true)}>
                  <Pencil /> Chỉnh sửa
                </Button>
              )}
              {isCoursePending && (
                <Button
                  variant="outline"
                  onClick={() => {
                    withdrawCourse.reset()
                    setWithdrawCourseOpen(true)
                  }}
                >
                  <RotateCcw /> Rút duyệt
                </Button>
              )}
              {canArchiveCourse && (
                <Button
                  variant="outline"
                  onClick={() => {
                    archiveCourse.reset()
                    setArchiveCourseOpen(true)
                  }}
                >
                  <Archive /> Lưu trữ
                </Button>
              )}
              {canDeleteCourse && (
                <Button
                  variant="dangerSoft"
                  onClick={() => {
                    deleteCourse.reset()
                    setDeleteCourseOpen(true)
                  }}
                >
                  <Trash2 /> Xóa khóa học
                </Button>
              )}
              {canSubmitCourse && (
                <Button
                  onClick={() => {
                    submitCourse.reset()
                    setConfirmCourseOpen(true)
                  }}
                >
                  <Send /> {course.status === 'REJECTED' ? 'Gửi duyệt lại khóa học' : 'Gửi duyệt khóa học'}
                </Button>
              )}
            </div>
          </div>

          {isCoursePending && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Khóa học đang ở trạng thái <strong>Chờ duyệt</strong> nên tạm thời khóa chỉnh sửa.
                Hãy nhấn <strong>Rút duyệt</strong> nếu bạn muốn cập nhật nội dung trước khi quản
                trị viên xét duyệt.
              </span>
            </div>
          )}

          {!course.isActive && course.deactivationReason && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
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
                  : 'bg-success-soft text-success',
              )}
            >
              {course.status === 'REJECTED' ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              )}
              <div>
                <p className="font-semibold">
                  {course.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú kiểm duyệt'}
                </p>
                <p className="mt-0.5">{course.reviewNote}</p>
              </div>
            </div>
          )}

          {course.status !== 'APPROVED' && !isCoursePending && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-info-soft px-4 py-3 text-sm text-info">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                Khi khóa học chưa được duyệt, các bài học ở trạng thái Bản nháp hoặc Bị từ chối sẽ
                được gửi duyệt cùng lúc khi bạn gửi duyệt khóa học.
              </span>
            </div>
          )}
        </div>
      </div>

      <section>
        <SectionLabel
          action={
            !isCoursePending && (
              <Button size="sm" onClick={() => setCreateSectionOpen(true)}>
                <Plus /> Thêm chương
              </Button>
            )
          }
        >
          Danh sách chương và bài học ({course.totalLessons} bài học)
        </SectionLabel>

        {course.sections.length === 0 ? (
          <div className="card flex flex-col items-start gap-3 p-6 text-sm text-muted-foreground">
            <p>Khóa học chưa có chương học nào. Hãy thêm chương đầu tiên để bắt đầu soạn bài.</p>
            {!isCoursePending && (
              <Button size="sm" variant="outline" onClick={() => setCreateSectionOpen(true)}>
                <Plus /> Thêm chương đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {course.sections.map((section) => (
              <div key={section.id} className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Chương {section.ordering}: {section.title}
                    </h3>
                    {section.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
                    )}
                  </div>
                  {!isCoursePending && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCreateLessonSectionId(section.id)}
                      >
                        <Plus /> Thêm bài học
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditSectionTarget(section)}
                      >
                        <Pencil /> Sửa chương
                      </Button>
                      <Button
                        size="sm"
                        variant="dangerSoft"
                        onClick={() => {
                          deleteSection.reset()
                          setDeleteSectionTarget(section)
                        }}
                      >
                        <Trash2 /> Xóa chương
                      </Button>
                    </div>
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
                      const isLessonPending = lesson.status === 'PENDING_REVIEW'
                      const canSubmitLesson =
                        course.status === 'APPROVED' &&
                        (lesson.status === 'DRAFT' || lesson.status === 'REJECTED')
                      const canWithdrawLesson =
                        course.status === 'APPROVED' && isLessonPending
                      const canEditLesson = !isCoursePending && !isLessonPending
                      const canDeleteLesson =
                        !isCoursePending &&
                        (lesson.status === 'DRAFT' || lesson.status === 'REJECTED')

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
                              {lesson.submittedAt && (
                                <span>Gửi duyệt: {formatDateTime(lesson.submittedAt)}</span>
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

                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/teacher/lessons/${lesson.id}/exercises`}>
                                <ListChecks />{' '}
                                {typeof lesson.exerciseCount === 'number'
                                  ? `Bài tập (${lesson.exerciseCount})`
                                  : 'Bài tập'}
                              </Link>
                            </Button>
                            {canEditLesson && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditLessonTarget(lesson)}
                              >
                                <Pencil /> Sửa
                              </Button>
                            )}
                            {canDeleteLesson && (
                              <Button
                                size="sm"
                                variant="dangerSoft"
                                onClick={() => {
                                  deleteLesson.reset()
                                  setDeleteLessonTarget(lesson)
                                }}
                              >
                                <Trash2 /> Xóa
                              </Button>
                            )}
                            {canWithdrawLesson && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  withdrawLesson.reset()
                                  setWithdrawLessonTarget(lesson)
                                }}
                              >
                                <RotateCcw /> Rút duyệt
                              </Button>
                            )}
                            {canSubmitLesson && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  submitLesson.reset()
                                  setLessonTarget(lesson)
                                }}
                              >
                                <Send />{' '}
                                {lesson.status === 'REJECTED' ? 'Gửi lại' : 'Gửi duyệt bài học'}
                              </Button>
                            )}
                          </div>
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

      <CourseFormDialog
        course={course}
        open={editCourseOpen}
        onOpenChange={setEditCourseOpen}
      />

      <SectionFormDialog
        courseId={course.id}
        open={createSectionOpen}
        onOpenChange={setCreateSectionOpen}
      />

      <SectionFormDialog
        courseId={course.id}
        section={editSectionTarget}
        open={!!editSectionTarget}
        onOpenChange={(open) => {
          if (!open) setEditSectionTarget(null)
        }}
      />

      <LessonFormDialog
        sectionId={createLessonSectionId ?? ''}
        open={!!createLessonSectionId}
        onOpenChange={(open) => {
          if (!open) setCreateLessonSectionId(null)
        }}
      />

      <LessonFormDialog
        sectionId={editLessonTarget?.sectionId ?? ''}
        lesson={editLessonTarget}
        open={!!editLessonTarget}
        onOpenChange={(open) => {
          if (!open) setEditLessonTarget(null)
        }}
      />

      <ConfirmActionDialog
        open={confirmCourseOpen}
        onOpenChange={setConfirmCourseOpen}
        title={course.status === 'REJECTED' ? 'Gửi duyệt lại khóa học' : 'Gửi duyệt khóa học'}
        description={`Gửi khóa học "${course.title}" và các bài học Bản nháp/Bị từ chối để quản trị viên xét duyệt?`}
        confirmLabel="Gửi duyệt"
        loading={submitCourse.isPending}
        error={submitCourse.error ? errorMessage(submitCourse.error) : null}
        onConfirm={() => {
          submitCourse.mutate(course.id, {
            onSuccess: () => setConfirmCourseOpen(false),
          })
        }}
      />

      <ConfirmActionDialog
        open={withdrawCourseOpen}
        onOpenChange={setWithdrawCourseOpen}
        title="Rút yêu cầu duyệt khóa học"
        description={`Đưa "${course.title}" và các bài học đang chờ duyệt về Bản nháp để tiếp tục chỉnh sửa?`}
        confirmLabel="Xác nhận rút duyệt"
        loading={withdrawCourse.isPending}
        error={withdrawCourse.error ? errorMessage(withdrawCourse.error) : null}
        onConfirm={() => {
          withdrawCourse.mutate(course.id, {
            onSuccess: () => setWithdrawCourseOpen(false),
          })
        }}
      />

      <ConfirmActionDialog
        open={archiveCourseOpen}
        onOpenChange={setArchiveCourseOpen}
        title="Lưu trữ khóa học"
        description={`Ẩn khóa học "${course.title}" khỏi danh sách tuyển sinh mới nhưng giữ nguyên dữ liệu học viên đã ghi danh?`}
        confirmLabel="Lưu trữ khóa học"
        loading={archiveCourse.isPending}
        error={archiveCourse.error ? errorMessage(archiveCourse.error) : null}
        onConfirm={() => {
          archiveCourse.mutate(course.id, {
            onSuccess: () => setArchiveCourseOpen(false),
          })
        }}
      />

      <ConfirmActionDialog
        open={deleteCourseOpen}
        onOpenChange={setDeleteCourseOpen}
        title="Xóa khóa học nháp"
        description={`Xóa vĩnh viễn khóa học "${course.title}"? Thao tác này không thể hoàn tác.`}
        confirmLabel="Xóa khóa học"
        confirmVariant="danger"
        loading={deleteCourse.isPending}
        error={deleteCourse.error ? errorMessage(deleteCourse.error) : null}
        onConfirm={() => {
          deleteCourse.mutate(course.id, {
            onSuccess: () => {
              setDeleteCourseOpen(false)
              navigate('/teacher/courses')
            },
          })
        }}
      />

      <ConfirmActionDialog
        open={!!deleteSectionTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteSectionTarget(null)
        }}
        title="Xóa chương học"
        description={
          deleteSectionTarget
            ? `Xóa chương "${deleteSectionTarget.title}" và các bài học nháp bên trong?`
            : ''
        }
        confirmLabel="Xóa chương"
        confirmVariant="danger"
        loading={deleteSection.isPending}
        error={deleteSection.error ? errorMessage(deleteSection.error) : null}
        onConfirm={() => {
          if (!deleteSectionTarget) return
          deleteSection.mutate(deleteSectionTarget.id, {
            onSuccess: () => setDeleteSectionTarget(null),
          })
        }}
      />

      <ConfirmActionDialog
        open={!!lessonTarget}
        onOpenChange={(open) => {
          if (!open) setLessonTarget(null)
        }}
        title={lessonTarget?.status === 'REJECTED' ? 'Gửi duyệt lại bài học' : 'Gửi duyệt bài học'}
        description={
          lessonTarget
            ? `Gửi bài học "${lessonTarget.title}" để quản trị viên duyệt trước khi hiển thị cho học viên?`
            : ''
        }
        confirmLabel="Gửi duyệt"
        loading={submitLesson.isPending}
        error={submitLesson.error ? errorMessage(submitLesson.error) : null}
        onConfirm={() => {
          if (!lessonTarget) return
          submitLesson.mutate(lessonTarget.id, {
            onSuccess: () => setLessonTarget(null),
          })
        }}
      />

      <ConfirmActionDialog
        open={!!withdrawLessonTarget}
        onOpenChange={(open) => {
          if (!open) setWithdrawLessonTarget(null)
        }}
        title="Rút yêu cầu duyệt bài học"
        description={
          withdrawLessonTarget
            ? `Đưa bài học "${withdrawLessonTarget.title}" về Bản nháp để chỉnh sửa?`
            : ''
        }
        confirmLabel="Xác nhận rút duyệt"
        loading={withdrawLesson.isPending}
        error={withdrawLesson.error ? errorMessage(withdrawLesson.error) : null}
        onConfirm={() => {
          if (!withdrawLessonTarget) return
          withdrawLesson.mutate(withdrawLessonTarget.id, {
            onSuccess: () => setWithdrawLessonTarget(null),
          })
        }}
      />

      <ConfirmActionDialog
        open={!!deleteLessonTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteLessonTarget(null)
        }}
        title="Xóa bài học"
        description={
          deleteLessonTarget
            ? `Xóa vĩnh viễn bài học "${deleteLessonTarget.title}"?`
            : ''
        }
        confirmLabel="Xóa bài học"
        confirmVariant="danger"
        loading={deleteLesson.isPending}
        error={deleteLesson.error ? errorMessage(deleteLesson.error) : null}
        onConfirm={() => {
          if (!deleteLessonTarget) return
          deleteLesson.mutate(deleteLessonTarget.id, {
            onSuccess: () => setDeleteLessonTarget(null),
          })
        }}
      />
    </div>
  )
}
