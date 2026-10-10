import { Link } from 'react-router-dom'
import { CheckCircle2, Circle, CornerDownRight, Loader, Timer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ExerciseSummary } from '@/lib/types'
import { EXERCISE_TYPE_LABEL, SKILL_LABEL } from '@/lib/utils'
import { answeredCount, useSessionStore } from '@/stores/session'
import { exerciseStatus } from './exerciseStatus'

const ICON = {
  done: <CheckCircle2 className="size-5 fill-success text-white" aria-label="Đã hoàn thành" />,
  'in-progress': <Loader className="size-5 text-info" aria-label="Đang làm" />,
  todo: <Circle className="size-5 text-muted-foreground/60" aria-label="Chưa làm" />,
}

export function ExerciseCard({ exercise }: { exercise: ExerciseSummary }) {
  const session = useSessionStore((s) => s.sessions[exercise.id])
  const status = exerciseStatus(exercise, session)
  const answered = answeredCount(session)

  return (
    <Link
      to={`/run/${exercise.id}`}
      className="card group flex flex-col gap-2 p-5 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {ICON[status]}
        <span>{SKILL_LABEL[exercise.skillType]}</span>
        <span>·</span>
        <span>{EXERCISE_TYPE_LABEL[exercise.exerciseType]}</span>
      </div>
      <p className="font-medium leading-snug group-hover:text-primary">{exercise.title}</p>
      {exercise.lessonTitle && (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CornerDownRight className="size-4 shrink-0" /> {exercise.lessonTitle}
        </p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {exercise.bestScore !== null && (
          <Badge tone="success">
            Best score {exercise.bestScore}/{exercise.maxScore}
          </Badge>
        )}
        {status === 'in-progress' && (
          <Badge tone="info">
            Đang làm {answered}/{exercise.questionCount}
          </Badge>
        )}
        {exercise.bestScore === null && status === 'todo' && (
          <Badge>{exercise.questionCount} câu hỏi</Badge>
        )}
        {exercise.timeLimit && (
          <Badge>
            <Timer /> {Math.round(exercise.timeLimit / 60)} phút
          </Badge>
        )}
      </div>
    </Link>
  )
}
