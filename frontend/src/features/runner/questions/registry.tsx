import type { ComponentType } from 'react'
import { CheckCircle2, Flag, Lightbulb, XCircle } from 'lucide-react'
import type { Question, QuestionResult, QuestionType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ChoiceQuestion } from './ChoiceQuestion'
import { DropListQuestion } from './DropListQuestion'
import { FillBlankQuestion } from './FillBlankQuestion'
import { describeAnswer, describeCorrect } from './helpers'
import { MatchingGrid } from './MatchingGrid'
import type { GroupAnswerProps, QuestionProps } from './types'

/** Question types answered one question at a time. MATCHING is rendered per group (a grid). */
const QUESTION_RENDERERS: Partial<Record<QuestionType, ComponentType<QuestionProps>>> = {
  MULTIPLE_CHOICE: ChoiceQuestion,
  TRUE_FALSE: ChoiceQuestion,
  DROPLIST: DropListQuestion,
  FILL_BLANK: FillBlankQuestion,
}

const GROUP_RENDERERS: Partial<Record<QuestionType, ComponentType<GroupAnswerProps>>> = {
  MATCHING: MatchingGrid,
}

export function ReviewNote({
  question,
  result,
  answer,
}: {
  question: Question
  result: QuestionResult
  answer: GroupAnswerProps['answers'][string]
}) {
  return (
    <div
      className={cn(
        'mt-3 rounded-xl border px-4 py-3 text-sm',
        result.correct
          ? 'border-success/30 bg-success-soft/60'
          : 'border-danger/30 bg-danger-soft/60',
      )}
    >
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span
          className={cn(
            'flex items-center gap-1.5 font-semibold',
            result.correct ? 'text-success' : 'text-danger',
          )}
        >
          {result.correct ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
          Câu {question.number}: {result.correct ? 'Đúng' : 'Sai'}
        </span>
        <span>
          Bạn chọn: <b>{describeAnswer(question, answer)}</b>
        </span>
        <span>
          Đáp án: <b className="text-success">{describeCorrect(question)}</b>
        </span>
      </p>
      {question.explanation && (
        <p className="mt-2 flex gap-2 text-foreground/80">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
          {question.explanation}
        </p>
      )}
    </div>
  )
}

export function QuestionGroupView({
  group,
  answers,
  onChange,
  results,
  flags = [],
  onToggleFlag,
}: GroupAnswerProps & { flags?: string[]; onToggleFlag?: (questionId: string) => void }) {
  const GroupRenderer = GROUP_RENDERERS[group.questionType]

  return (
    <section aria-labelledby={`${group.id}-title`}>
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <span
          id={`${group.id}-title`}
          className="shrink-0 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary"
        >
          {group.groupTitle ?? `Question ${group.questionRange}`}
        </span>
        {group.groupInstruction && (
          <p className="flex-1 whitespace-pre-line pt-0.5 text-[15px] leading-relaxed">
            {group.groupInstruction}
          </p>
        )}
      </div>
      {group.imageUrl && (
        <img
          src={group.imageUrl}
          alt=""
          className="mb-5 max-h-96 rounded-xl border object-contain"
        />
      )}

      {GroupRenderer ? (
        <>
          <GroupRenderer group={group} answers={answers} onChange={onChange} results={results} />
          {results &&
            group.questions.map((q) => (
              <ReviewNote key={q.id} question={q} result={results[q.id]} answer={answers[q.id]} />
            ))}
        </>
      ) : (
        <ol className="space-y-6">
          {group.questions.map((q) => {
            const Renderer = QUESTION_RENDERERS[q.questionType]
            const flagged = flags.includes(q.id)
            const result = results?.[q.id]
            return (
              <li key={q.id} id={`q-${q.number}`} className="scroll-mt-24">
                <div className="flex gap-3">
                  <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-info-soft text-sm font-semibold text-info">
                    {q.number}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3 text-[15px]">
                    {q.questionType !== 'FILL_BLANK' && q.questionType !== 'DROPLIST' && (
                      <p className="whitespace-pre-line pt-1 font-medium">{q.questionText}</p>
                    )}
                    {Renderer ? (
                      <Renderer
                        question={q}
                        group={group}
                        value={answers[q.id]}
                        onChange={(v) => onChange(q.id, v)}
                        result={result}
                      />
                    ) : (
                      <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                        Dạng câu hỏi này chưa được hỗ trợ.
                      </p>
                    )}
                    {result && <ReviewNote question={q} result={result} answer={answers[q.id]} />}
                  </div>
                  {onToggleFlag && (
                    <button
                      type="button"
                      onClick={() => onToggleFlag(q.id)}
                      aria-pressed={flagged}
                      aria-label={
                        flagged ? `Bỏ đánh dấu câu ${q.number}` : `Đánh dấu câu ${q.number}`
                      }
                      className={cn(
                        'mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted',
                        flagged ? 'text-warning' : 'text-muted-foreground/50',
                      )}
                    >
                      <Flag className={cn('size-4', flagged && 'fill-warning')} />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
