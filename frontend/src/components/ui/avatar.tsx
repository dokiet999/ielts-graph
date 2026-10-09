import { cn } from '@/lib/utils'

const COLORS = ['bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500']

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function Avatar({
  name,
  src,
  className,
}: {
  name: string
  src?: string | null
  className?: string
}) {
  const color = COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length]
  return src ? (
    <img src={src} alt={name} className={cn('size-10 rounded-full object-cover', className)} />
  ) : (
    <span
      aria-label={name}
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
        color,
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
