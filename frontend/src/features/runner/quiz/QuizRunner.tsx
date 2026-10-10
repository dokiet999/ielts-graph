import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Grip, Lightbulb, X, XCircle } from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { api, errorMessage } from '@/lib/api'
import type { Exercise } from '@/lib/types'
import { cn } from '@/lib/utils'
import { isAnswered, useSessionStore } from '@/stores/session'
import { ChoiceQuestion } from '../questions/ChoiceQuestion'
import { DropListQuestion } from '../questions/DropListQuestion'
import { BlankInput } from '../questions/FillBlankQuestion'
import { splitBlank } from '@/lib/grading'

/**
 * One question per screen with immediate feedback ("Kiểm tra"), used for short LESSON exercises.
 * Each check is stored in the session so a reload keeps the learner's progress.
 */
export function QuizRunner({
  exercise,
  onExit,
  onFinish,
  finishing,
}: {
  exercise: Exercise
  onExit: () => void
  onFinish: () => void
  finishing: boolean
}) {
  const items = exercise.questionGroups.flatMap((group) =>
    group.questions.map((question) => ({ group, question })),
  )
  const session = useSessionStore((s) => s.sessions[exercise.id])
  const { setAnswer, setQuizIndex, markChecked } = useSessionStore()
  const index = Math.min(session?.quizIndex ?? 0, items.length - 1)
  const { group, question } = items[index]
  const value = session?.answers[question.id]
  const check = session?.checked[question.id]
  const checkedCount = Object.keys(session?.checked ?? {}).length
  const isLast = index === items.length - 1
  const allChecked = checkedCount === items.length

  const checkMutation = useMutation({
    mutationFn: () => api.checkAnswer(exercise.id, question.id, value!),
    onSuccess: (res) => markChecked(exercise.id, question.id, res),
  })

  const goTo = (i: number) => {
    checkMutation.reset()
    setQuizIndex(exercise.id, i)
  }

  const blank = question.questionType === 'FILL_BLANK' ? splitBlank(question.questionText) : null

  return (
    <div className="flex h-screen flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-5">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={onExit}
          aria-label="Thoát"
        >
          <X />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              aria-label="Danh sách câu hỏi"
            >
              <Grip />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto">
            <p className="mb-3 text-sm font-semibold">Danh sách câu hỏi</p>
            <div className="grid grid-cols-5 gap-2">
              {items.map(({ question: q }, i) => {
                const c = session?.checked[q.id]
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      'size-10 rounded-lg border text-sm font-medium',
                      i === index && 'ring-2 ring-primary ring-offset-1',
                      c?.correct && 'border-success bg-success-soft text-success',
                      c && !c.correct && 'border-danger bg-danger-soft text-danger',
                    )}
                  >
                    {q.number}
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
        <LogoMark className="hidden size-9 sm:block" />
        <div
          className="ml-2 h-3 flex-1 overflow-hidden rounded-full bg-success-soft"
          aria-label={`Đã kiểm tra ${checkedCount}/${items.length} câu`}
        >
          <div
            className="h-full rounded-full bg-success transition-all duration-500"
            style={{ width: `${(checkedCount / items.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4">
        <div className="mx-auto max-w-3xl py-8">
          <p className="mb-2 text-sm text-muted-foreground">
            Câu {index + 1}/{items.length} · {exercise.title}
          </p>
          <h1 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">
            {group.groupTitle ?? 'Chọn đáp án đúng'}
          </h1>
          {group.groupInstruction && (
            <p className="mb-4 text-muted-foreground">{group.groupInstruction}</p>
          )}

          {question.questionType === 'FILL_BLANK' ? (
            <div className="rounded-xl bg-muted px-5 py-5 text-lg leading-loose">
              {blank ? blank[0] : question.questionText}
              <BlankInput
                question={question}
                value={value}
                onChange={(v) => !check && setAnswer(exercise.id, question.id, v)}
                correct={check?.correct}
              />
              {blank?.[1]}
            </div>
          ) : (
            <>
              <div className="mb-8 whitespace-pre-line rounded-xl bg-muted px-5 py-5 text-[17px] leading-relaxed">
                {question.questionText}
              </div>
              {question.questionType === 'DROPLIST' ? (
                <DropListQuestion
                  question={question}
                  group={group}
                  value={value}
                  onChange={(v) => setAnswer(exercise.id, question.id, v)}
                />
              ) : (
                <ChoiceQuestion
                  size="lg"
                  question={question}
                  group={group}
                  value={value}
                  onChange={(v) => setAnswer(exercise.id, question.id, v)}
                  correctIds={check?.correctOptionIds}
                />
              )}
            </>
          )}
          {checkMutation.error && (
            <p className="mt-4 text-sm text-danger">{errorMessage(checkMutation.error)}</p>
          )}
        </div>
      </main>

      <footer
        className={cn(
          'border-t',
          check &&
            (check.correct
              ? 'border-success/30 bg-success-soft'
              : 'border-danger/30 bg-danger-soft'),
        )}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center">
          {check ? (
            <div className="flex-1">
              <p
                className={cn(
                  'flex items-center gap-2 text-lg font-bold',
                  check.correct ? 'text-success' : 'text-danger',
                )}
              >
                {check.correct ? <CheckCircle2 /> : <XCircle />}
                {check.correct ? 'Chính xác!' : 'Chưa chính xác'}
              </p>
              {!check.correct && check.acceptedAnswers.length > 0 && (
                <p className="mt-1 text-sm">
                  Đáp án đúng: <b>{check.acceptedAnswers.join(' / ')}</b>
                </p>
              )}
              {check.explanation && (
                <p className="mt-1 flex gap-2 text-sm text-foreground/80">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
                  {check.explanation}
                </p>
              )}
            </div>
          ) : (
            <div className="flex-1">
              <Button
                variant="outline"
                size="lg"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
              >
                Trở về
              </Button>
            </div>
          )}
          {!check ? (
            <Button
              size="lg"
              onClick={() => checkMutation.mutate()}
              disabled={!isAnswered(value)}
              loading={checkMutation.isPending}
            >
              Kiểm tra
            </Button>
          ) : isLast || allChecked ? (
            allChecked ? (
              <Button
                size="lg"
                variant={check.correct ? 'success' : 'primary'}
                onClick={onFinish}
                loading={finishing}
              >
                Hoàn thành
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => goTo(items.findIndex(({ question: q }) => !session?.checked[q.id]))}
              >
                Câu chưa làm
              </Button>
            )
          ) : (
            <Button
              size="lg"
              variant={check.correct ? 'success' : 'primary'}
              onClick={() => goTo(index + 1)}
            >
              Tiếp tục
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
