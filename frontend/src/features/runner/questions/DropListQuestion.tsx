import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { asArray } from './helpers'
import type { QuestionProps } from './types'

/** DROPLIST: pick one option from a dropdown (e.g. matching headings). */
export function DropListQuestion({ question, value, onChange, result }: QuestionProps) {
  const selected = asArray(value)[0] ?? ''
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-medium">{question.questionText}</span>
      <div className="relative min-w-0 flex-1 basis-64">
        <select
          value={selected}
          disabled={!!result}
          onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
          aria-label={`Câu ${question.number}`}
          className={cn(
            'h-10 w-full appearance-none rounded-lg border-2 bg-surface pl-3 pr-9 text-sm focus:border-primary focus:outline-none disabled:opacity-100',
            result &&
              (result.correct ? 'border-success bg-success-soft' : 'border-danger bg-danger-soft'),
          )}
        >
          <option value="">— Chọn đáp án —</option>
          {question.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.optionText}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}
