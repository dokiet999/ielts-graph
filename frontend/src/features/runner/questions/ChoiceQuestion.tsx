import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { asArray, maxSelections, splitOptionLabel } from './helpers'
import type { QuestionProps } from './types'

/**
 * MULTIPLE_CHOICE (single or "choose TWO") and TRUE_FALSE. `size="lg"` is the big centred
 * button style of the quiz runner; the default is the compact list used in the test runner.
 */
export function ChoiceQuestion({
  question,
  group,
  value,
  onChange,
  result,
  size = 'md',
  correctIds,
}: QuestionProps & { size?: 'md' | 'lg'; correctIds?: string[] }) {
  const selected = asArray(value)
  const max = maxSelections(question, group)
  const locked = !!result || !!correctIds
  const isCorrectOption = (id: string, fallback?: boolean) =>
    correctIds ? correctIds.includes(id) : !!fallback

  const toggle = (id: string) => {
    if (locked) return
    if (max === 1) return onChange([id])
    if (selected.includes(id)) return onChange(selected.filter((x) => x !== id))
    // Keep the most recent choices when the limit is reached.
    onChange([...selected, id].slice(-max))
  }

  return (
    <div className="space-y-2">
      {max > 1 && !locked && (
        <p className="text-xs text-muted-foreground">
          Chọn {max} đáp án ({selected.length}/{max})
        </p>
      )}
      <div
        role={max === 1 ? 'radiogroup' : 'group'}
        aria-label={`Câu ${question.number}`}
        className={cn(size === 'lg' ? 'space-y-4' : 'space-y-2')}
      >
        {question.options.map((o, i) => {
          const { label, text } = splitOptionLabel(o.optionText, i)
          const isSelected = selected.includes(o.id)
          const showRight = locked && isCorrectOption(o.id, o.isCorrect)
          const showWrong = locked && isSelected && !showRight
          return (
            <button
              key={o.id}
              type="button"
              role={max === 1 ? 'radio' : 'checkbox'}
              aria-checked={isSelected}
              disabled={locked}
              onClick={() => toggle(o.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border text-left transition-colors disabled:cursor-default',
                size === 'lg' ? 'min-h-16 px-4 py-3 text-base' : 'px-3 py-2.5 text-[15px]',
                !locked && 'hover:border-primary/50 hover:bg-primary-soft/40',
                isSelected && !locked && 'border-primary bg-primary-soft',
                showRight && 'border-success bg-success-soft',
                showWrong && 'border-danger bg-danger-soft',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold',
                  isSelected && !locked && 'border-primary bg-primary text-primary-foreground',
                  showRight && 'border-success bg-success text-white',
                  showWrong && 'border-danger bg-danger text-white',
                )}
              >
                {showRight ? (
                  <Check className="size-4" />
                ) : showWrong ? (
                  <X className="size-4" />
                ) : (
                  label
                )}
              </span>
              <span className={cn('flex-1', size === 'lg' && 'text-center')}>{text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
