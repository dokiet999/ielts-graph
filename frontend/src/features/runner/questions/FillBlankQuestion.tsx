import { splitBlank } from '@/lib/grading'
import { cn } from '@/lib/utils'
import { asText } from './helpers'
import type { QuestionProps } from './types'

export function BlankInput({
  question,
  value,
  onChange,
  correct,
  className,
}: {
  question: QuestionProps['question']
  value: QuestionProps['value']
  onChange: QuestionProps['onChange']
  /** undefined = answering, true/false = reviewing. */
  correct?: boolean
  className?: string
}) {
  const reviewing = correct !== undefined
  return (
    <input
      type="text"
      value={asText(value)}
      readOnly={reviewing}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Câu ${question.number}`}
      placeholder={String(question.number)}
      autoComplete="off"
      spellCheck={false}
      className={cn(
        'mx-1 inline-block h-9 w-40 rounded-lg border-2 bg-surface px-2 text-center align-middle text-[15px] font-medium placeholder:font-semibold placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none',
        reviewing && (correct ? 'border-success bg-success-soft' : 'border-danger bg-danger-soft'),
        className,
      )}
    />
  )
}

/** FILL_BLANK: the input replaces the "______" inside the question text. */
export function FillBlankQuestion({ question, value, onChange, result }: QuestionProps) {
  const parts = splitBlank(question.questionText)
  const input = (
    <BlankInput question={question} value={value} onChange={onChange} correct={result?.correct} />
  )
  if (!parts) {
    return (
      <p className="leading-loose">
        {question.questionText} {input}
      </p>
    )
  }
  return (
    <p className="leading-loose">
      {parts[0]}
      {input}
      {parts[1]}
    </p>
  )
}
