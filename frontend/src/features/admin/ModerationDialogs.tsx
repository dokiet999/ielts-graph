import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Textarea } from '@/components/ui/input'

export function ApproveContentDialog({
  open,
  onOpenChange,
  itemTitle,
  itemKind,
  loading,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemTitle: string
  itemKind: 'khóa học' | 'bài học'
  loading?: boolean
  error?: string | null
  onConfirm: (note?: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ApproveDialogBody
          key={itemTitle}
          itemTitle={itemTitle}
          itemKind={itemKind}
          loading={loading}
          error={error}
          onClose={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      )}
    </Dialog>
  )
}

function ApproveDialogBody({
  itemTitle,
  itemKind,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  itemTitle: string
  itemKind: 'khóa học' | 'bài học'
  loading?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (note?: string) => void
}) {
  const [note, setNote] = useState('')
  return (
    <DialogContent
      title={`Phê duyệt ${itemKind}`}
      description={
        itemKind === 'khóa học'
          ? `Khóa học "${itemTitle}" và các bài học đang chờ duyệt đi kèm sẽ được xuất bản cho học viên.`
          : `Bài học "${itemTitle}" sẽ hiển thị công khai trong khóa học.`
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = note.trim()
          onConfirm(trimmed || undefined)
        }}
        className="space-y-4"
      >
        <Field label="Ghi chú cho giảng viên (không bắt buộc)" htmlFor="approve-note">
          <Textarea
            id="approve-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Nội dung đạt chuẩn, đã xuất bản."
            maxLength={2000}
          />
        </Field>
        {error && <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" variant="success" loading={loading}>
            Xác nhận duyệt
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

export function RejectContentDialog({
  open,
  onOpenChange,
  itemTitle,
  itemKind,
  loading,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemTitle: string
  itemKind: 'khóa học' | 'bài học'
  loading?: boolean
  error?: string | null
  onConfirm: (reason: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ReasonDialogBody
          key={itemTitle}
          title={`Từ chối ${itemKind}`}
          description={
            itemKind === 'khóa học'
              ? `Nhập lý do từ chối "${itemTitle}" để giảng viên chỉnh sửa và gửi duyệt lại.`
              : `Nhập lý do từ chối bài học "${itemTitle}" để giảng viên chỉnh sửa.`
          }
          fieldLabel="Lý do từ chối"
          placeholder="Ví dụ: Thiếu file nghe hoặc mô tả bài học chưa rõ..."
          submitLabel="Từ chối"
          loading={loading}
          error={error}
          onClose={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      )}
    </Dialog>
  )
}

export function ReasonActionDialog({
  open,
  onOpenChange,
  itemKey = '',
  title,
  description,
  fieldLabel,
  placeholder,
  submitLabel,
  loading,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemKey?: string
  title: string
  description: string
  fieldLabel: string
  placeholder: string
  submitLabel: string
  loading?: boolean
  error?: string | null
  onConfirm: (reason: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ReasonDialogBody
          key={`${title}:${itemKey}`}
          title={title}
          description={description}
          fieldLabel={fieldLabel}
          placeholder={placeholder}
          submitLabel={submitLabel}
          loading={loading}
          error={error}
          onClose={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      )}
    </Dialog>
  )
}

export function LockTeacherDialog({
  open,
  onOpenChange,
  teacherName,
  loading,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherName: string
  loading?: boolean
  error?: string | null
  onConfirm: (reason: string) => void
}) {
  return (
    <ReasonActionDialog
      open={open}
      onOpenChange={onOpenChange}
      itemKey={teacherName}
      title="Khóa tài khoản giảng viên"
      description={`Tài khoản của "${teacherName}" sẽ không thể đăng nhập cho đến khi được mở khóa.`}
      fieldLabel="Lý do khóa tài khoản"
      placeholder="Ví dụ: Vi phạm quy định nội dung hoặc tạm ngưng cộng tác..."
      submitLabel="Khóa tài khoản"
      loading={loading}
      error={error}
      onConfirm={onConfirm}
    />
  )
}

function ReasonDialogBody({
  title,
  description,
  fieldLabel,
  placeholder,
  submitLabel,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  fieldLabel: string
  placeholder: string
  submitLabel: string
  loading?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const displayError = localError ?? error

  return (
    <DialogContent title={title} description={description}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = reason.trim()
          if (!trimmed) {
            setLocalError('Vui lòng nhập lý do.')
            return
          }
          setLocalError(null)
          onConfirm(trimmed)
        }}
        className="space-y-4"
      >
        <Field label={fieldLabel} htmlFor="reason-input" error={localError ?? undefined}>
          <Textarea
            id="reason-input"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (localError) setLocalError(null)
            }}
            placeholder={placeholder}
            aria-invalid={!!localError}
            maxLength={2000}
          />
        </Field>
        {error && !localError && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="submit" variant="danger" loading={loading} aria-invalid={!!displayError}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  loading,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'success' | 'danger'
  loading?: boolean
  error?: string | null
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent title={title} description={description}>
          <div className="space-y-4">
            {error && (
              <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button type="button" variant={confirmVariant} loading={loading} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  )
}
