import * as Dropdown from '@radix-ui/react-dropdown-menu'
import * as Pop from '@radix-ui/react-popover'
import * as Tip from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

export const DropdownMenu = Dropdown.Root
export const DropdownMenuTrigger = Dropdown.Trigger

export function DropdownMenuContent({
  className,
  align = 'start',
  ...props
}: Dropdown.DropdownMenuContentProps) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={6}
        className={cn('z-50 min-w-48 rounded-xl border bg-surface p-1.5 shadow-lg', className)}
        {...props}
      />
    </Dropdown.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: Dropdown.DropdownMenuItemProps) {
  return (
    <Dropdown.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-muted [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export const DropdownMenuSeparator = () => <Dropdown.Separator className="my-1 h-px bg-border" />

export const Popover = Pop.Root
export const PopoverTrigger = Pop.Trigger
export const PopoverAnchor = Pop.Anchor

export function PopoverContent({ className, ...props }: Pop.PopoverContentProps) {
  return (
    <Pop.Portal>
      <Pop.Content
        sideOffset={8}
        className={cn('z-50 w-80 rounded-xl border bg-surface p-4 shadow-lg', className)}
        {...props}
      />
    </Pop.Portal>
  )
}

export const TooltipProvider = Tip.Provider

export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  return (
    <Tip.Root>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content
          sideOffset={6}
          className="z-50 rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow"
        >
          {content}
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  )
}
