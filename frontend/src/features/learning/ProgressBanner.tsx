import { ProgressBar } from '@/components/ui/progress'

export function ProgressBanner({
  done,
  inProgress,
  total,
  noun = 'bài',
}: {
  done: number
  inProgress: number
  total: number
  noun?: string
}) {
  const finished = total > 0 && done === total && inProgress === 0
  return (
    <div className="card flex items-center gap-5 p-6">
      <div className="hidden size-20 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-4xl sm:flex">
        {finished ? '🎉' : '📚'}
      </div>
      <div className="flex-1">
        <p className={finished ? 'font-semibold text-success' : 'font-semibold'}>
          {finished
            ? `Chúc mừng bạn đã hoàn thành tất cả ${total} ${noun}!`
            : `Bạn đã hoàn thành ${done} ${noun}${inProgress ? ` và đang làm ${inProgress} ${noun}` : ''}`}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {finished
            ? 'Bạn có thể làm lại để cải thiện điểm số.'
            : 'Tiếp tục tập trung hoàn thành các bài còn lại nhé!'}
        </p>
        <div className="mt-4 flex items-center gap-4">
          <ProgressBar value={done} secondary={inProgress} max={total} />
          <span className="shrink-0 text-sm font-semibold">
            {done + inProgress} / {total}
          </span>
        </div>
      </div>
    </div>
  )
}
