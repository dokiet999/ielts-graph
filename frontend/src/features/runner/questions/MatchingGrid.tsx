import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { asArray } from './helpers'
import type { GroupAnswerProps } from './types'

/**
 * MATCHING: one row per question, one column per letter (A–G), like the paragraph-matching
 * grid in the reference design. Columns come from the first question's options.
 */
export function MatchingGrid({ group, answers, onChange, results }: GroupAnswerProps) {
  const columns = group.questions[0]?.options.map((o) => o.optionText) ?? []
  return (
    <div className="overflow-x-auto rounded-2xl border p-3">
      <table className="w-full border-separate border-spacing-1.5">
        <thead>
          <tr>
            <th className="sr-only">Câu hỏi</th>
            {columns.map((c) => (
              <th key={c} className="w-11 text-center text-sm font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {group.questions.map((q) => {
            const selected = asArray(answers[q.id])[0]
            const result = results?.[q.id]
            return (
              <tr key={q.id} id={`q-${q.number}`} className="scroll-mt-24">
                <td className="rounded-xl border px-3 py-2.5 text-[15px]">
                  <span className="mr-1.5 font-semibold text-info">{q.number}.</span>
                  {q.questionText}
                </td>
                {q.options.map((o) => {
                  const isSelected = selected === o.id
                  const right = !!result && !!o.isCorrect
                  const wrong = !!result && isSelected && !o.isCorrect
                  return (
                    <td key={o.id} className="p-0">
                      <button
                        type="button"
                        disabled={!!result}
                        aria-label={`Câu ${q.number}: ${o.optionText}`}
                        aria-pressed={isSelected}
                        onClick={() => onChange(q.id, isSelected ? [] : [o.id])}
                        className={cn(
                          'flex h-12 w-11 items-center justify-center rounded-xl border text-muted-foreground/40 transition-colors disabled:cursor-default',
                          !result && 'hover:border-primary/50 hover:bg-primary-soft/50',
                          isSelected &&
                            !result &&
                            'border-primary bg-primary text-primary-foreground',
                          right && 'border-success bg-success text-white',
                          wrong && 'border-danger bg-danger text-white',
                        )}
                      >
                        {wrong ? <X className="size-4" /> : <Check className="size-4" />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
