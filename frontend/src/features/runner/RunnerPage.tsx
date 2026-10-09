import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ErrorState, PageLoader } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { useExercise, useSubmit } from '@/lib/queries'
import type { Exercise } from '@/lib/types'
import { cn, EXERCISE_TYPE_LABEL, formatClock } from '@/lib/utils'
import { isAnswered, useSessionStore } from '@/stores/session'
import { QuizRunner } from './quiz/QuizRunner'
import { SplitPaneRunner } from './test/SplitPaneRunner'
import { useRunnerTimer } from './test/useRunnerTimer'

const questionCount = (ex: Exercise) =>
  ex.questionGroups.reduce((n, g) => n + g.questions.length, 0)

function useExitTo(exercise: Exercise) {
  const navigate = useNavigate()
  return () =>
    exercise.courseId && exercise.sectionId
      ? navigate(`/learn/${exercise.courseId}/${exercise.sectionId}/exercises`)
      : navigate('/')
}

function useFinish(exercise: Exercise) {
  const navigate = useNavigate()
  const submit = useSubmit()
  const clear = useSessionStore((s) => s.clear)
  const finish = () => {
    const session = useSessionStore.getState().sessions[exercise.id]
    submit.mutate(
      {
        exerciseId: exercise.id,
        answers: session?.answers ?? {},
        timeSpent: session?.elapsed ?? 0,
      },
      {
        onSuccess: (detail) => {
          clear(exercise.id)
          navigate(`/submissions/${detail.id}`, { replace: true })
        },
      },
    )
  }
  return { finish, submit }
}

function TestRunner({ exercise }: { exercise: Exercise }) {
  const session = useSessionStore((s) => s.sessions[exercise.id])
  const { setAnswer, toggleFlag, setHighlights } = useSessionStore()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const onExit = useExitTo(exercise)
  const { finish, submit } = useFinish(exercise)
  const { elapsed, remaining } = useRunnerTimer(exercise.id, exercise.timeLimit, {
    running: !submit.isPending && !submit.isSuccess,
    onExpire: finish,
  })

  const answers = session?.answers ?? {}
  const flags = session?.flags ?? []
  const total = questionCount(exercise)
  const answered = exercise.questionGroups
    .flatMap((g) => g.questions)
    .filter((q) => isAnswered(answers[q.id])).length
  const lowTime = remaining !== null && remaining <= 60

  return (
    <>
      <SplitPaneRunner
        exercise={exercise}
        mode="answer"
        answers={answers}
        onAnswer={(qid, v) => setAnswer(exercise.id, qid, v)}
        flags={flags}
        onToggleFlag={(qid) => toggleFlag(exercise.id, qid)}
        highlights={session?.highlights ?? []}
        onHighlightsChange={(next) => setHighlights(exercise.id, next)}
        status={
          <div className="flex items-center gap-3">
            <span className="hidden font-semibold sm:inline">Làm bài</span>
            <span
              className={cn(
                'flex items-center gap-1.5 font-semibold tabular-nums text-info',
                lowTime && 'text-danger',
              )}
              aria-live={lowTime ? 'polite' : 'off'}
              title={remaining !== null ? 'Thời gian còn lại' : 'Thời gian đã làm'}
            >
              <Clock className="size-4" />
              {formatClock(remaining ?? elapsed)}
            </span>
          </div>
        }
        footerLabel={EXERCISE_TYPE_LABEL[exercise.exerciseType]}
        finalAction={
          <Button onClick={() => setConfirmOpen(true)} loading={submit.isPending}>
            Nộp bài
          </Button>
        }
        onExit={onExit}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent title="Nộp bài?" description={`Bạn đã trả lời ${answered}/${total} câu.`}>
          <div className="space-y-2 text-sm">
            {answered < total && (
              <p className="flex items-center gap-2 rounded-xl bg-warning-soft px-3 py-2 text-warning">
                <AlertTriangle className="size-4" /> Còn {total - answered} câu chưa trả lời.
              </p>
            )}
            {flags.length > 0 && (
              <p className="text-muted-foreground">
                Bạn đang đánh dấu {flags.length} câu để xem lại.
              </p>
            )}
            {submit.error && <p className="text-danger">{errorMessage(submit.error)}</p>}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Làm tiếp
            </Button>
            <Button onClick={finish} loading={submit.isPending}>
              Nộp bài
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {submit.isPending && !confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-2xl bg-surface px-6 py-4 font-medium shadow-xl">
            Đang nộp bài...
          </div>
        </div>
      )}
    </>
  )
}

function Quiz({ exercise }: { exercise: Exercise }) {
  const onExit = useExitTo(exercise)
  const { finish, submit } = useFinish(exercise)
  return (
    <QuizRunner
      exercise={exercise}
      onExit={onExit}
      onFinish={finish}
      finishing={submit.isPending}
    />
  )
}

export function RunnerPage() {
  const { exerciseId } = useParams()
  const { data: exercise, isLoading, error, refetch } = useExercise(exerciseId)
  const ensure = useSessionStore((s) => s.ensure)

  useEffect(() => {
    if (exercise)
      ensure(exercise.id, { title: exercise.title, questionCount: questionCount(exercise) })
  }, [exercise, ensure])

  if (isLoading) return <PageLoader />
  if (error || !exercise) {
    return (
      <div className="p-6">
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      </div>
    )
  }
  return exercise.exerciseType === 'LESSON' ? (
    <Quiz exercise={exercise} />
  ) : (
    <TestRunner exercise={exercise} />
  )
}
