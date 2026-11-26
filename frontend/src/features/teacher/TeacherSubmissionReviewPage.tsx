import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageSquareQuote,
  Save,
  Sparkles,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { SectionLabel } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { describeAnswer, describeCorrect } from '@/features/runner/questions/helpers'
import { errorMessage } from '@/lib/api'
import { formatBand } from '@/lib/band'
import { useTeacherGradeSubmission, useTeacherSubmissionDetail } from '@/lib/queries'
import type { SubmissionDetail } from '@/lib/types'
import { cn, EXERCISE_TYPE_LABEL, formatDateTime, formatDuration, SKILL_LABEL } from '@/lib/utils'

function FeedbackForm({ sub }: { sub: SubmissionDetail }) {
  const gradeMutation = useTeacherGradeSubmission()
  const isBandSkill = sub.skillType === 'WRITING' || sub.skillType === 'SPEAKING'

  const [scoreText, setScoreText] = useState(
    sub.teacherScore !== null && sub.teacherScore !== undefined ? String(sub.teacherScore) : '',
  )
  const [feedbackText, setFeedbackText] = useState(sub.teacherFeedback ?? '')
  const [clientError, setClientError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setClientError(null)
    setSavedNotice(false)

    const trimmedFeedback = feedbackText.trim()
    if (!trimmedFeedback) {
      setClientError('Vui lòng nhập nhận xét của giáo viên.')
      return
    }

    let parsedScore: number | null = null
    if (scoreText.trim() !== '') {
      const n = Number(scoreText.trim())
      if (Number.isNaN(n) || n < 0 || n > sub.maxScore) {
        setClientError(`Điểm giáo viên phải nằm trong khoảng 0 đến ${sub.maxScore}.`)
        return
      }
      if (isBandSkill && Math.abs((n * 2) % 1) > 1e-6) {
        setClientError('Điểm Writing/Speaking phải theo bước 0.5 (ví dụ 6.0, 6.5, 7.0).')
        return
      }
      parsedScore = n
    }

    gradeMutation.mutate(
      {
        submissionId: sub.id,
        body: {
          teacherScore: parsedScore,
          teacherFeedback: trimmedFeedback,
        },
      },
      {
        onSuccess: () => setSavedNotice(true),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6" noValidate>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UserCheck className="size-5 text-primary" />
          <h2 className="text-lg font-semibold">Chấm điểm & Nhận xét của giảng viên</h2>
        </div>
        {sub.gradedAt && (
          <span className="text-xs text-muted-foreground">
            Cập nhật lần cuối: {formatDateTime(sub.gradedAt)}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={`Điểm giáo viên (tùy chọn, tối đa ${sub.maxScore})`}
          htmlFor="teacher-score-input"
        >
          <Input
            id="teacher-score-input"
            type="number"
            min={0}
            max={sub.maxScore}
            step={isBandSkill ? 0.5 : 0.25}
            placeholder={
              sub.aiScore !== null && sub.aiScore !== undefined
                ? `AI: ${sub.aiScore}`
                : 'Để trống nếu giữ nguyên'
            }
            value={scoreText}
            onChange={(e) => setScoreText(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {isBandSkill
              ? 'Nhập theo thang 0.5 (để trống nếu giữ nguyên điểm AI).'
              : 'Để trống nếu giữ nguyên điểm tự động.'}
          </p>
        </Field>
      </div>

      <Field label="Nhận xét chuyên môn cho học viên" htmlFor="teacher-feedback-input">
        <Textarea
          id="teacher-feedback-input"
          rows={5}
          placeholder="Nhận xét chi tiết về cấu trúc bài làm, điểm mạnh, lỗi cần khắc phục và hướng dẫn luyện thêm..."
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
        />
      </Field>

      {(clientError || gradeMutation.error) && (
        <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
          {clientError ?? errorMessage(gradeMutation.error)}
        </p>
      )}

      {savedNotice && (
        <p className="rounded-xl bg-success-soft px-3.5 py-2.5 text-sm text-success">
          Đã lưu điểm và nhận xét của giáo viên thành công.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={gradeMutation.isPending}>
          <Save /> Lưu đánh giá giáo viên
        </Button>
      </div>
    </form>
  )
}

export function TeacherSubmissionReviewPage() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const [params] = useSearchParams()
  const detail = useTeacherSubmissionDetail(submissionId)

  if (detail.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-36" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (detail.error || !detail.data) {
    return (
      <ErrorState
        message={detail.error ? errorMessage(detail.error) : 'Không thể tải bài làm của học viên.'}
        onRetry={() => detail.refetch()}
      />
    )
  }

  const sub = detail.data
  const courseId = params.get('courseId') ?? sub.courseId
  const studentId = params.get('studentId') ?? sub.studentId
  const backTo =
    courseId && studentId
      ? `/teacher/courses/${courseId}/students/${studentId}`
      : courseId
        ? `/teacher/courses/${courseId}/students`
        : '/teacher/courses'

  const resultsByQuestion = Object.fromEntries(sub.results.map((r) => [r.questionId, r]))
  const writingSummary = sub.writingFeedback?.summary
  const speakingSummary = sub.speakingFeedback?.summary
  const transcript = sub.transcript || sub.speakingFeedback?.transcript || ''

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={backTo}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại tiến độ học viên
        </Link>

        <div className="card p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{SKILL_LABEL[sub.skillType]}</Badge>
                <Badge tone="neutral">{EXERCISE_TYPE_LABEL[sub.exerciseType]}</Badge>
                <Badge tone="neutral">Lần nộp {sub.attemptNumber}</Badge>
                {sub.gradingMethod === 'TEACHER' && <Badge tone="primary">Đã có chấm GV</Badge>}
              </div>
              <h1 className="text-2xl font-bold tracking-tight">{sub.exerciseTitle}</h1>
              <p className="text-sm text-muted-foreground">
                Học viên:{' '}
                <strong className="text-foreground">
                  {sub.studentName ?? 'Học viên'}
                  {sub.studentEmail ? ` (${sub.studentEmail})` : ''}
                </strong>{' '}
                · Nộp lúc {formatDateTime(sub.submittedAt)}
                {sub.timeSpent ? (
                  <span className="ml-2 inline-flex items-center gap-1">
                    <Clock className="size-3.5" /> {formatDuration(sub.timeSpent)}
                  </span>
                ) : null}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4 rounded-2xl bg-muted/60 px-5 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Điểm chính thức</p>
                <p className="text-2xl font-bold">
                  {sub.skillType === 'WRITING' || sub.skillType === 'SPEAKING'
                    ? `Band ${formatBand(sub.score)}`
                    : `${sub.score}/${sub.maxScore}`}
                </p>
              </div>
              {sub.aiScore !== null && sub.aiScore !== undefined && (
                <div className="border-l pl-4">
                  <p className="text-xs text-muted-foreground">Điểm AI</p>
                  <p className="text-lg font-semibold text-muted-foreground">
                    {sub.skillType === 'WRITING' || sub.skillType === 'SPEAKING'
                      ? `Band ${formatBand(sub.aiScore)}`
                      : `${sub.aiScore}/${sub.maxScore}`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <FeedbackForm key={`${sub.id}-${sub.gradedAt ?? 'new'}`} sub={sub} />

      {sub.skillType === 'WRITING' && (
        <section className="space-y-4">
          <SectionLabel>Bài luận của học viên</SectionLabel>
          <div className="card p-6">
            <p className="whitespace-pre-wrap leading-relaxed">
              {sub.essayText || 'Không có nội dung bài viết.'}
            </p>
          </div>
          {(writingSummary || (sub.writingFeedback?.criteria.length ?? 0) > 0) && (
            <div className="card space-y-3 p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-info" /> Phân tích tham khảo từ AI
              </h3>
              {writingSummary && <p className="text-sm text-muted-foreground">{writingSummary}</p>}
              {sub.writingFeedback?.criteria.map((c) => (
                <div key={c.id} className="rounded-xl bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{c.id}</span>
                    <span>Band {formatBand(c.band)}</span>
                  </div>
                  {c.comment && <p className="mt-1 text-muted-foreground">{c.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {sub.skillType === 'SPEAKING' && (
        <section className="space-y-4">
          <SectionLabel>Bản ghi lời nói (Transcript)</SectionLabel>
          <div className="card p-6">
            <p className="whitespace-pre-wrap leading-relaxed">
              {transcript || 'Không có transcript.'}
            </p>
          </div>
          {speakingSummary && (
            <div className="card space-y-2 p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <MessageSquareQuote className="size-4 text-info" /> Tóm tắt từ AI
              </h3>
              <p className="text-sm text-muted-foreground">{speakingSummary}</p>
            </div>
          )}
        </section>
      )}

      {(sub.skillType === 'READING' || sub.skillType === 'LISTENING') && (
        <section className="space-y-4">
          <SectionLabel>
            Chi tiết đáp án ({sub.correctCount}/{sub.questionCount} câu đúng)
          </SectionLabel>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Câu</th>
                  <th className="px-5 py-3 font-semibold">Học viên trả lời</th>
                  <th className="px-5 py-3 font-semibold">Đáp án đúng</th>
                  <th className="px-5 py-3 text-right font-semibold">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sub.exercise.questionGroups.flatMap((g) =>
                  g.questions.map((q) => {
                    const correct = resultsByQuestion[q.id]?.correct
                    return (
                      <tr key={q.id}>
                        <td className="px-5 py-3 font-semibold">{q.number}</td>
                        <td className={cn('px-5 py-3', !correct && 'text-danger')}>
                          {describeAnswer(q, sub.answers[q.id])}
                        </td>
                        <td className="px-5 py-3 font-medium text-success">{describeCorrect(q)}</td>
                        <td className="px-5 py-3 text-right">
                          {correct ? (
                            <CheckCircle2 className="ml-auto size-5 text-success" aria-label="Đúng" />
                          ) : (
                            <XCircle className="ml-auto size-5 text-danger" aria-label="Sai" />
                          )}
                        </td>
                      </tr>
                    )
                  }),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
