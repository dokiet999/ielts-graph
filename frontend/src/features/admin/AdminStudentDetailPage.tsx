import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCheck,
  Lock,
  MessageSquareText,
  ShieldCheck,
  Unlock,
} from 'lucide-react'
import { SectionLabel } from '@/components/PageHeading'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/input'
import { ProgressBar } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { SCHEDULE_STATUS_META } from '@/lib/moderation'
import {
  useAdminLockStudentFinalTest,
  useAdminStudentProgress,
  useAdminUnlockStudentFinalTest,
} from '@/lib/queries'
import type { SectionProgressItem } from '@/lib/types'
import { EXERCISE_TYPE_LABEL, formatDate, formatDateTime, formatDuration, SKILL_LABEL } from '@/lib/utils'

const DEADLINE_OPTIONS = [3, 7, 14, 30]

export function AdminStudentDetailPage() {
  const { courseId, studentId } = useParams<{ courseId: string; studentId: string }>()
  const detail = useAdminStudentProgress(courseId, studentId)
  const unlockFinalTest = useAdminUnlockStudentFinalTest()
  const lockFinalTest = useAdminLockStudentFinalTest()

  const [unlockSection, setUnlockSection] = useState<SectionProgressItem | null>(null)
  const [deadlineDays, setDeadlineDays] = useState<number>(7)

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (detail.error || !detail.data) {
    return (
      <ErrorState
        message={detail.error ? errorMessage(detail.error) : 'Không thể tải tiến độ học viên.'}
        onRetry={() => detail.refetch()}
      />
    )
  }

  const d = detail.data
  const statusMeta = SCHEDULE_STATUS_META[d.scheduleStatus] ?? SCHEDULE_STATUS_META.ON_TRACK

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/admin/courses/${d.courseId}`}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại chi tiết khóa học
        </Link>

        <div className="card p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <Avatar name={d.fullName} className="size-14" />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{d.fullName}</h1>
                  <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {d.email} · @{d.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  Khóa học: <strong className="text-foreground">{d.courseTitle}</strong> · Ghi danh{' '}
                  {formatDate(d.enrolledAt)}
                  {d.lastSubmittedAt ? ` · Nộp gần nhất ${formatDateTime(d.lastSubmittedAt)}` : ''}
                </p>
              </div>
            </div>

            <div className="min-w-[240px] space-y-2 rounded-2xl bg-muted/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tiến độ hoàn thành</span>
                <span className="font-bold">{d.progressPercent}%</span>
              </div>
              <ProgressBar value={d.progressPercent} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {d.completedExercises}/{d.totalExercises} bài tập
                </span>
                <span>
                  Điểm TB: <strong>{d.averageScore !== null ? `${d.averageScore}%` : '—'}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <SectionLabel>Tiến độ từng chương & Cấp quyền Final Test</SectionLabel>
        {d.sections.length === 0 ? (
          <div className="card p-6 text-sm text-muted-foreground">
            Khóa học chưa có chương hoặc bài học nào được duyệt.
          </div>
        ) : (
          <div className="space-y-4">
            {d.sections.map((section) => (
              <div key={section.sectionId} className="card overflow-hidden">
                <div className="flex flex-col gap-3 border-b bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold">
                      Chương {section.ordering}: {section.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Hoàn thành {section.completedExercises}/{section.totalExercises} bài luyện
                    </p>
                  </div>

                  {section.finalTest && (
                    <div className="flex flex-wrap items-center gap-2">
                      {section.finalTest.unlocked ? (
                        <>
                          <Badge tone="success">
                            <ShieldCheck /> Đã mở Final Test ({section.finalTest.deadlineDays ?? 7}{' '}
                            ngày · hết hạn {formatDate(section.finalTest.grantExpiresAt)})
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDeadlineDays(section.finalTest?.deadlineDays ?? 7)
                              unlockFinalTest.reset()
                              setUnlockSection(section)
                            }}
                          >
                            <Unlock /> Gia hạn
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={lockFinalTest.isPending}
                            onClick={() =>
                              lockFinalTest.mutate({
                                courseId: d.courseId,
                                sectionId: section.sectionId,
                                studentId: d.studentId,
                              })
                            }
                          >
                            <Lock /> Khóa Final Test
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge tone={section.finalTest.grantExpired ? 'danger' : 'neutral'}>
                            {section.finalTest.grantExpired
                              ? 'Đã hết hạn Final Test'
                              : 'Chưa mở Final Test'}
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => {
                              setDeadlineDays(section.finalTest?.deadlineDays ?? 7)
                              unlockFinalTest.reset()
                              setUnlockSection(section)
                            }}
                          >
                            <Unlock /> Mở khóa Final Test
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {section.lessons.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">
                    Chưa có bài học nào được duyệt trong chương này.
                  </p>
                ) : (
                  <div className="divide-y">
                    {section.lessons.map((lesson) => (
                      <div key={lesson.lessonId} className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">
                            {lesson.ordering}. {lesson.title}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {lesson.completedExercises}/{lesson.totalExercises} bài tập hoàn thành
                          </span>
                        </div>

                        {lesson.exercises.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {lesson.exercises.map((ex) => (
                              <div
                                key={ex.exerciseId}
                                className="flex flex-col gap-2 rounded-xl border bg-surface px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                  {ex.completed ? (
                                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                                  ) : (
                                    <Clock className="size-4 shrink-0 text-muted-foreground" />
                                  )}
                                  <span className="font-medium">{ex.title}</span>
                                  <Badge tone="info">{SKILL_LABEL[ex.skillType]}</Badge>
                                  <Badge tone="neutral">
                                    {EXERCISE_TYPE_LABEL[ex.exerciseType]}
                                  </Badge>
                                  {ex.hasTeacherFeedback && (
                                    <Badge tone="success">
                                      <MessageSquareText /> Đã nhận xét
                                    </Badge>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span>{ex.attemptCount} lần nộp</span>
                                  <span>
                                    Điểm cao nhất:{' '}
                                    <strong className="text-foreground">
                                      {ex.bestScore !== null ? `${ex.bestScore}/${ex.maxScore}` : '—'}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionLabel>Lịch sử nộp bài trong khóa ({d.submissions.length})</SectionLabel>
        {d.submissions.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="Học viên chưa có bài nộp nào trong khóa học này"
            className="bg-surface"
          />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Bài tập</th>
                  <th className="px-4 py-3.5 font-semibold">Kỹ năng</th>
                  <th className="px-4 py-3.5 font-semibold">Lần nộp</th>
                  <th className="px-4 py-3.5 font-semibold">Điểm</th>
                  <th className="px-4 py-3.5 font-semibold">Nhận xét GV</th>
                  <th className="px-5 py-3.5 font-semibold">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {d.submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/20">
                    <td className="px-5 py-3.5 font-medium">{sub.exerciseTitle}</td>
                    <td className="px-4 py-3.5">
                      <Badge tone="info">{SKILL_LABEL[sub.skillType]}</Badge>
                    </td>
                    <td className="px-4 py-3.5">Lần {sub.attemptNumber}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold">
                        {sub.score}/{sub.maxScore}
                      </span>
                      {sub.gradingMethod === 'TEACHER' && (
                        <Badge tone="primary" className="ml-2">
                          Giáo viên
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {sub.teacherFeedback ? (
                        <Badge tone="success">Đã nhận xét</Badge>
                      ) : (
                        <Badge tone="neutral">Chưa nhận xét</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {formatDateTime(sub.submittedAt)}
                      {sub.timeSpent ? ` · ${formatDuration(sub.timeSpent)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog
        open={!!unlockSection}
        onOpenChange={(open) => {
          if (!open) setUnlockSection(null)
        }}
      >
        <DialogContent
          title={
            unlockSection?.finalTest?.unlocked
              ? 'Gia hạn / Cập nhật Final Test'
              : 'Mở khóa Final Test cho học viên'
          }
          description={
            unlockSection
              ? `Cấp quyền làm "${unlockSection.finalTest?.exerciseTitle ?? 'Final Test'}" trong ${unlockSection.title} cho ${d.fullName}.`
              : ''
          }
          className="max-w-md"
        >
          <div className="space-y-4">
            <Field label="Thời hạn hoàn thành" htmlFor="admin-ft-deadline-days">
              <Select
                id="admin-ft-deadline-days"
                value={String(deadlineDays)}
                onChange={(e) => setDeadlineDays(Number(e.target.value))}
              >
                {DEADLINE_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} ngày
                  </option>
                ))}
              </Select>
            </Field>

            {unlockFinalTest.error && (
              <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                {errorMessage(unlockFinalTest.error)}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUnlockSection(null)}
                disabled={unlockFinalTest.isPending}
              >
                Hủy
              </Button>
              <Button
                type="button"
                loading={unlockFinalTest.isPending}
                onClick={() => {
                  if (!unlockSection) return
                  unlockFinalTest.mutate(
                    {
                      courseId: d.courseId,
                      sectionId: unlockSection.sectionId,
                      studentId: d.studentId,
                      deadlineDays,
                    },
                    { onSuccess: () => setUnlockSection(null) },
                  )
                }}
              >
                <Unlock /> Xác nhận mở khóa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
