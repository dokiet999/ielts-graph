import { cn } from '@/lib/utils'

/** Horizontal bar with up to two filled segments (e.g. completed + in progress). */
export function ProgressBar({
  value,
  secondary = 0,
  max = 100,
  className,
  tone = 'success',
}: {
  value: number
  secondary?: number
  max?: number
  className?: string
  tone?: 'success' | 'info' | 'primary'
}) {
  const pct = (n: number) => `${max > 0 ? Math.min(100, (n / max) * 100) : 0}%`
  const fill = { success: 'bg-success', info: 'bg-info', primary: 'bg-primary' }[tone]
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      className={cn('flex h-2 w-full gap-1 overflow-hidden rounded-full bg-muted', className)}
    >
      {value > 0 && <div className={cn('rounded-full', fill)} style={{ width: pct(value) }} />}
      {secondary > 0 && <div className="rounded-full bg-info" style={{ width: pct(secondary) }} />}
    </div>
  )
}

/** Circular progress used on the overview page: big value, small total underneath. */
export function ProgressRing({
  value,
  max,
  label,
  caption,
  display,
  size = 112,
}: {
  value: number
  max: number
  label: string
  caption: string
  display?: string
  size?: number
}) {
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div className="card flex flex-col items-center gap-4 p-5 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - ratio)}
            className="stroke-info transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{display ?? value}</span>
          <span className="mt-0.5 border-t px-2 pt-0.5 text-xs text-muted-foreground">{max}</span>
        </div>
      </div>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">{caption}</p>
      </div>
    </div>
  )
}
