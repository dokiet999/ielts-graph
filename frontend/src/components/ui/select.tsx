import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Native select styled like the filter pills in the reference design. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className={cn('relative', className)}>
      <select
        ref={ref}
        className="h-11 w-full cursor-pointer appearance-none rounded-xl bg-muted pl-3.5 pr-9 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  ),
)
Select.displayName = 'Select'
