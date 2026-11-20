import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  FileEdit,
  ListChecks,
  Plus,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { ConfirmActionDialog } from '@/features/admin/ModerationDialogs'
import { errorMessage } from '@/lib/api'
import { CONTENT_STATUS_META } from '@/lib/moderation'
import { useDeleteExercise, useTeacherLessonExercises } from '@/lib/queries'
import type { TeacherExerciseSummary } from '@/lib/types'
import { SKILL_LABEL } from '@/lib/utils'
import { ExerciseFormDialog } from './ExerciseFormDialog'

export function TeacherLessonExercisesPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useTeacherLessonExercises(lessonId)

  const deleteExercise = useDeleteExercise()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TeacherExerciseSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeacherExerciseSummary | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <ErrorState
        message={error ? errorMessage(error) : 'Không tìm thấy bài học.'}
        onRetry={() => refetch()}
      />
    )
  }

  const lessonStatus = CONTENT_STATUS_META[data.lessonStatus]
  const isFrozen = data.courseStatus === 'PENDING_REVIEW' || data.lessonStatus === 'PENDING_REVIEW'

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/teacher/courses/${data.courseId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại khóa học: {data.courseTitle}
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone={lessonStatus.tone}>{lessonStatus.label}</Badge>
              <span className="text-xs text-muted-foreground">{data.sectionTitle}</span>
            </div>
            <PageTitle
              title={`Bài tập: ${data.lessonTitle}`}
              subtitle="Thêm bài tập thực hành và soạn câu hỏi cho 4 kỹ năng IELTS."
            />
          </div>

          {!isFrozen && (
            <Button onClick={() => setCreateOpen(true)} className="shrink-0 self-start">
              <Plus /> Thêm bài tập
            </Button>
          )}
        </div>
      </div>

      {isFrozen && (
        <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Nội dung đang ở trạng thái <strong>Chờ duyệt</strong> nên tạm thời khóa thêm/sửa/xóa bài
            tập. Hãy rút duyệt nếu bạn muốn chỉnh sửa.
          </span>
        </div>
      )}

      {data.exercises.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Bài học này chưa có bài tập nào"
          description="Thêm bài tập Reading, Listening, Writing hoặc Speaking để học viên luyện tập."
          action={
            !isFrozen && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Thêm bài tập đầu tiên
              </Button>
            )
          }
          className="bg-surface"
        />
      ) : (
        <div className="space-y-3">
          {data.exercises.map((ex) => (
            <div
              key={ex.id}
              className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{SKILL_LABEL[ex.skillType]}</Badge>
                  <Badge tone="neutral">{ex.exerciseType}</Badge>
                  <Badge tone={ex.questionCount > 0 ? 'success' : 'warning'}>
                    {ex.questionCount} câu hỏi
                  </Badge>
                  {ex.submissionCount > 0 && (
                    <Badge tone="primary">
                      <Users /> {ex.submissionCount} lượt nộp
                    </Badge>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-semibold">
                    {ex.ordering}. {ex.title}
                  </h3>
                  {ex.instruction && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {ex.instruction}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  {ex.timeLimit ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" /> {Math.ceil(ex.timeLimit / 60)} phút
                    </span>
                  ) : (
                    <span>Không giới hạn thời gian</span>
                  )}
                  <span>Tối đa {ex.maxAttempts} lượt làm</span>
                  <span>Điểm đạt: {ex.passingScore}</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="soft">
                  <Link to={`/teacher/exercises/${ex.id}`}>
                    <FileEdit /> Soạn câu hỏi
                  </Link>
                </Button>
                {!isFrozen && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditTarget(ex)}>
                      <Settings2 /> Cài đặt
                    </Button>
                    <Button
                      size="sm"
                      variant="dangerSoft"
                      onClick={() => {
                        deleteExercise.reset()
                        setDeleteTarget(ex)
                      }}
                    >
                      <Trash2 /> Xóa
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ExerciseFormDialog
        lessonId={data.lessonId}
        defaultSkill={data.courseSkillFocus}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => navigate(`/teacher/exercises/${created.id}`)}
      />

      <ExerciseFormDialog
        lessonId={data.lessonId}
        exercise={editTarget}
        defaultSkill={data.courseSkillFocus}
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      />

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Xóa bài tập"
        description={
          deleteTarget
            ? deleteTarget.submissionCount > 0
              ? `Bài tập "${deleteTarget.title}" đã có ${deleteTarget.submissionCount} lượt nộp từ học viên nên hệ thống sẽ chặn xóa.`
              : `Xóa vĩnh viễn bài tập "${deleteTarget.title}" cùng toàn bộ nhóm câu hỏi và đáp án bên trong?`
            : ''
        }
        confirmLabel="Xóa bài tập"
        confirmVariant="danger"
        loading={deleteExercise.isPending}
        error={deleteExercise.error ? errorMessage(deleteExercise.error) : null}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteExercise.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
      />
    </div>
  )
}
