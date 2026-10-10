import type { Answers, QuestionGroup, QuestionResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import { isAnswered } from '@/stores/session'

export function QuestionNavigator({
  groups,
  answers,
  flags = [],
  results,
  currentGroup,
  onJump,
}: {
  groups: QuestionGroup[]
  answers: Answers
  flags?: string[]
  results?: Record<string, QuestionResult>
  currentGroup: number
  onJump: (groupIndex: number, questionNumber: number) => void
}) {
  return (
    <nav aria-label="Danh sách câu hỏi" className="flex flex-wrap justify-center gap-1.5">
      {groups.map((g, gi) =>
        g.questions.map((q) => {
          const answered = isAnswered(answers[q.id])
          const flagged = flags.includes(q.id)
          const result = results?.[q.id]
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJump(gi, q.number)}
              aria-label={`Câu ${q.number}${answered ? ', đã trả lời' : ''}${flagged ? ', đã đánh dấu' : ''}`}
              aria-current={gi === currentGroup ? 'step' : undefined}
              className={cn(
                'relative h-9 min-w-11 rounded-full border px-3 text-sm font-medium transition-colors',
                gi === currentGroup ? 'border-foreground/60' : 'border-border',
                !result && answered && 'bg-muted-foreground/15',
                !result && !answered && 'bg-surface',
                result?.correct && 'border-success bg-success text-white',
                result && !result.correct && 'border-danger bg-danger text-white',
              )}
            >
              {q.number}
              {flagged && (
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-surface bg-warning" />
              )}
            </button>
          )
        }),
      )}
    </nav>
  )
}
