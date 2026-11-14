import * as D from '@radix-ui/react-dialog'

export interface ExitConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmExit: () => void
}

/**
 * Confirmation modal shown when the learner clicks the exit button while taking a test,
 * matching the "Thoát và lưu lại bài" design.
 */
export function ExitConfirmDialog({ open, onOpenChange, onConfirmExit }: ExitConfirmDialogProps) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <D.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-surface px-8 py-7 text-center shadow-xl focus:outline-none">
          <D.Title className="text-xl font-bold text-foreground">Thoát và lưu lại bài</D.Title>
          <D.Description className="mt-3 text-base leading-relaxed text-foreground/85">
            Bài làm của bạn sẽ được lưu lại và có thể làm tiếp vào lần sau. Bạn có chắc muốn thoát
            không?
          </D.Description>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="min-w-[110px] rounded-full border border-border bg-surface px-6 py-2.5 text-base font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Ở lại
            </button>
            <button
              type="button"
              onClick={onConfirmExit}
              className="min-w-[110px] rounded-full bg-primary px-6 py-2.5 text-base font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Thoát
            </button>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

