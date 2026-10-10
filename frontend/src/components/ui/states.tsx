import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-6 animate-spin text-primary', className)} />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-muted', className)} />
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-8" />
      </div>
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Không tải được dữ liệu"
      description={message}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        )
      }
    />
  )
}
