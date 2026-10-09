import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium [&_svg]:size-3.5',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-foreground/80',
        success: 'bg-success-soft text-success',
        info: 'bg-info-soft text-info',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
        primary: 'bg-primary-soft text-primary',
        outline: 'border border-success/40 bg-success-soft text-success',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
