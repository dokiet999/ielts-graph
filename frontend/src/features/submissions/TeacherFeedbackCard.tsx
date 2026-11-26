import { MessageSquareQuote, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatBand } from '@/lib/band'
import type { SubmissionDetail } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

export function TeacherFeedbackCard({ sub }: { sub: SubmissionDetail }) {
  const hasScore = sub.teacherScore !== null && sub.teacherScore !== undefined
  const hasFeedback = Boolean(sub.teacherFeedback && sub.teacherFeedback.trim())
  if (!hasScore && !hasFeedback) return null

  const isBandSkill = sub.skillType === 'WRITING' || sub.skillType === 'SPEAKING'
  const formatScoreValue = (val: number) =>
    isBandSkill ? `Band ${formatBand(val)}` : `${val}/${sub.maxScore}`

  return (
    <section
      className="card mt-6 border-primary/30 bg-primary-soft/20 p-6"
      aria-label="Nhận xét của giảng viên"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <UserCheck className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Đánh giá của giảng viên</h2>
            <p className="text-xs text-muted-foreground">
              {sub.gradedByName ? `Giảng viên: ${sub.gradedByName}` : 'Giảng viên phụ trách'}
              {sub.gradedAt ? ` · Cập nhật lúc ${formatDateTime(sub.gradedAt)}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasScore && (
            <Badge tone="primary" className="px-3 py-1 text-sm font-semibold">
              Điểm giảng viên: {formatScoreValue(sub.teacherScore!)}
            </Badge>
          )}
          {sub.aiScore !== null && sub.aiScore !== undefined && (
            <Badge tone="neutral">Điểm AI ban đầu: {formatScoreValue(sub.aiScore)}</Badge>
          )}
        </div>
      </div>

      {hasFeedback && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface p-4 text-sm leading-relaxed">
          <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="whitespace-pre-wrap">{sub.teacherFeedback}</p>
        </div>
      )}
    </section>
  )
}
