import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, Loader2, Moon, PenLine, Sun, Type, X } from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/menu'
import { writingSubmitError } from '@/lib/api'
import { useSubmitWriting } from '@/lib/queries'
import type { Exercise } from '@/lib/types'
import { cn, formatClock } from '@/lib/utils'
import {
  countWords,
  WRITING_MAX_CHARS,
  WRITING_MIN_SUBMIT_WORDS,
  writingMinWords,
} from '@/lib/writing'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { useWritingResultsStore } from '@/stores/writingResults'
import { useRunnerTimer } from '../test/useRunnerTimer'

/** Key of the essay inside the session answers, so the draft survives a reload like other answers. */
export const ESSAY_KEY = 'essay'

/** The essay prompt: the exercise instruction, or the text of its only question. */
function essayPrompt(exercise: Exercise) {
  const question = exercise.questionGroups[0]?.questions[0]?.questionText
  return exercise.instruction?.trim() || question || exercise.title
}

/** QuestionType id of the essay (QT_W2_*), set by the backend in exercises.content.task. */
function essayTask(exercise: Exercise) {
  const task = (exercise.content as { task?: unknown } | null)?.task
  return typeof task === 'string' ? task : null
}

function GradingOverlay() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-xl"
      >
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <p className="mt-4 font-semibold">AI đang chấm bài của bạn...</p>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">Đã chờ {seconds} giây</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {seconds < 30
            ? 'Việc này thường mất khoảng 10–30 giây. Vui lòng không đóng trang.'
            : 'Lần này AI phản hồi chậm hơn bình thường, vui lòng chờ thêm một chút.'}
        </p>
      </div>
    </div>
  )
}

export function WritingRunner({ exercise, onExit }: { exercise: Exercise; onExit: () => void }) {
  const navigate = useNavigate()
  const session = useSessionStore((s) => s.sessions[exercise.id])
  const setAnswer = useSessionStore((s) => s.setAnswer)
  const clear = useSessionStore((s) => s.clear)
  const saveResult = useWritingResultsStore((s) => s.save)
  const { dark, toggleDark, cycleFontSize, fontSize } = useSettingsStore()
  const submit = useSubmitWriting()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const stored = session?.answers[ESSAY_KEY]
  const essay = typeof stored === 'string' ? stored : ''
  const words = countWords(essay)
  const minWords = writingMinWords(essayTask(exercise))
  const canSubmit = words >= WRITING_MIN_SUBMIT_WORDS
  const { elapsed, remaining } = useRunnerTimer(exercise.id, exercise.timeLimit, {
    running: !submit.isPending && !submit.isSuccess,
  })
  const timeUp = remaining === 0
  const error = submit.error ? writingSubmitError(submit.error) : null

  const finish = () => {
    setConfirmOpen(false)
    submit.mutate(
      { exerciseId: exercise.id, essayText: essay, timeSpent: elapsed },
      {
        onSuccess: (result) => {
          saveResult(result.submissionId, result.feedback)
          clear(exercise.id)
          navigate(`/submissions/${result.submissionId}`, { replace: true })
        },
      },
    )
  }

  return (
    <div className="flex h-screen flex-col bg-surface">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Button variant="outline" size="icon" onClick={onExit} aria-label="Thoát">
          <X />
        </Button>
        <LogoMark className="hidden size-8 sm:block" />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <span className="hidden font-semibold sm:inline">Làm bài Writing</span>
          <span
            className={cn(
              'flex items-center gap-1.5 font-semibold tabular-nums text-info',
              timeUp && 'text-danger',
            )}
            title={remaining !== null ? 'Thời gian còn lại' : 'Thời gian đã làm'}
          >
            <Clock className="size-4" />
            {formatClock(remaining ?? elapsed)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content={`Cỡ chữ: ${fontSize}px`}>
            <Button variant="ghost" size="icon" onClick={cycleFontSize} aria-label="Đổi cỡ chữ">
              <Type />
            </Button>
          </Tooltip>
          <Tooltip content={dark ? 'Giao diện sáng' : 'Giao diện tối'}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDark}
              aria-label="Đổi giao diện sáng/tối"
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </Tooltip>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <section
          aria-label="Đề bài"
          className="overflow-y-auto border-b p-5 sm:p-8 lg:border-b-0 lg:border-r"
          style={{ fontSize }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <PenLine className="size-4" /> Writing Task 2
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight">{exercise.title}</h1>
          <p className="mt-4 whitespace-pre-line leading-relaxed">{essayPrompt(exercise)}</p>
          <p className="mt-6 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            Bài viết cần tối thiểu {minWords} từ. AI chấm theo 4 tiêu chí: Task Response, Coherence
            &amp; Cohesion, Lexical Resource và Grammatical Range &amp; Accuracy.
          </p>
        </section>

        <section className="flex min-h-0 flex-col p-5 sm:p-8">
          {error && (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              <AlertTriangle className="size-4 shrink-0" />
              <p className="min-w-0 flex-1">{error.message}</p>
              {error.retryable && (
                <Button size="sm" variant="outline" onClick={finish}>
                  Thử lại
                </Button>
              )}
            </div>
          )}
          <textarea
            aria-label="Bài viết của bạn"
            placeholder="Viết bài luận của bạn ở đây..."
            value={essay}
            onChange={(e) => setAnswer(exercise.id, ESSAY_KEY, e.target.value)}
            maxLength={WRITING_MAX_CHARS}
            spellCheck={false}
            className="min-h-64 w-full flex-1 resize-none rounded-2xl border bg-background p-4 leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ fontSize }}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p
              className={cn(
                'text-sm font-medium tabular-nums',
                words >= minWords ? 'text-success' : 'text-muted-foreground',
              )}
              aria-live="polite"
            >
              {words} / {minWords} từ
              {words > 0 && words < minWords && (
                <span className="ml-2 text-warning">Chưa đủ số từ tối thiểu</span>
              )}
            </p>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSubmit}
              loading={submit.isPending}
            >
              Nộp bài
            </Button>
          </div>
          {words > 0 && !canSubmit && (
            <p className="mt-2 text-right text-xs text-muted-foreground">
              Cần ít nhất {WRITING_MIN_SUBMIT_WORDS} từ để nộp bài.
            </p>
          )}
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent title="Nộp bài?" description={`Bài viết của bạn có ${words} từ.`}>
          {words < minWords && (
            <p className="flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
              <AlertTriangle className="size-4 shrink-0" /> Bài chưa đạt {minWords} từ, điểm Task
              Response có thể bị trừ.
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            AI sẽ chấm bài trong khoảng 10–30 giây. Mỗi lần nộp được tính là một lượt làm.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Viết tiếp
            </Button>
            <Button onClick={finish}>Nộp bài</Button>
          </div>
        </DialogContent>
      </Dialog>

      {submit.isPending && <GradingOverlay />}
    </div>
  )
}
