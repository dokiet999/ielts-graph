import { cn } from '@/lib/utils'

/** Small uppercase heading used to label blocks (e.g. "KHÓA ĐANG HỌC"). */
export function SectionLabel({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-4', className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {children}
      </h2>
      {action}
    </div>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
