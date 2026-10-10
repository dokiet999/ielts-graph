import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ErrorState, PageLoader } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { useSubmission } from '@/lib/queries'
import {
  cn,
  EXERCISE_TYPE_LABEL,
  formatDateTime,
  formatDuration,
  percent,
  SKILL_LABEL,
} from '@/lib/utils'
import { describeAnswer, describeCorrect } from '../runner/questions/helpers'

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Trophy
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" /> {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function ResultPage() {
  const { submissionId } = useParams()
  const { data: sub, isLoading, error, refetch } = useSubmission(submissionId)

  if (isLoading) return <PageLoader />
  if (error || !sub) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />

  const ex = sub.exercise
  const pct = percent(sub.correctCount, sub.questionCount)
  const results = Object.fromEntries(sub.results.map((r) => [r.questionId, r]))
  const backTo =
    ex.courseId && ex.sectionId ? `/learn/${ex.courseId}/${ex.sectionId}/exercises` : '/history'
  const message =
    pct >= 80
      ? 'Xuất sắc! Bạn làm rất tốt.'
      : pct >= 50
        ? 'Khá tốt! Xem lại các câu sai để tiến bộ hơn.'
        : 'Đừng nản! Hãy xem lại đáp án và thử lại nhé.'

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4">
        <Link to={backTo}>
          <ArrowLeft /> Quay lại
        </Link>
      </Button>

      <div className="card overflow-hidden">
        <div className="border-b bg-primary-soft/50 p-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone={sub.skillType === 'READING' ? 'primary' : 'info'}>
              {SKILL_LABEL[sub.skillType]}
            </Badge>
            <Badge>{EXERCISE_TYPE_LABEL[sub.exerciseType]}</Badge>
            <Badge>Lần làm thứ {sub.attemptNumber}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{sub.exerciseTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nộp lúc {formatDateTime(sub.submittedAt)}
          </p>
        </div>
        <div className="p-6">
          <p className="mb-4 font-medium">{message}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              icon={Target}
              label="Số câu đúng"
              value={`${sub.correctCount}/${sub.questionCount}`}
              hint={`${pct}%`}
            />
            <Metric icon={Trophy} label="Điểm" value={`${sub.score}/${sub.maxScore}`} />
            <Metric icon={Clock} label="Thời gian làm" value={formatDuration(sub.timeSpent)} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to={`/submissions/${sub.id}/review`}>
                <Eye /> Xem lại chi tiết
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/run/${sub.exerciseId}`}>
                <RotateCcw /> Làm lại
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <h2 className="mb-4 mt-10 text-xl font-semibold">Đáp án</h2>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Câu</th>
              <th className="px-5 py-3 font-medium">Bạn trả lời</th>
              <th className="px-5 py-3 font-medium">Đáp án đúng</th>
              <th className="px-5 py-3 text-right font-medium">Kết quả</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ex.questionGroups.flatMap((g) =>
              g.questions.map((q) => {
                const correct = results[q.id]?.correct
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
    </div>
  )
}
