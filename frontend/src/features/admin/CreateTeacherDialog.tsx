import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, Check, Copy } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { errorMessage } from '@/lib/api'
import { useCreateTeacher } from '@/lib/queries'
import type { TeacherAccount } from '@/lib/types'

const schema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.]{3,50}$/, 'Tên đăng nhập gồm 3–50 ký tự (a-z, 0-9, _ hoặc .)'),
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ').max(255),
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(255),
  phone: z.string().trim().max(20, 'Số điện thoại tối đa 20 ký tự').optional(),
  bio: z.string().trim().max(2000, 'Giới thiệu tối đa 2000 ký tự').optional(),
  password: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim().length === 0 || (v.length >= 8 && v.length <= 100),
      'Mật khẩu phải từ 8–100 ký tự (hoặc để trống để tự tạo)',
    ),
})

type FormValues = z.infer<typeof schema>

export function CreateTeacherDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <CreateTeacherBody onClose={() => onOpenChange(false)} />}
    </Dialog>
  )
}

function CreateTeacherBody({ onClose }: { onClose: () => void }) {
  const createTeacher = useCreateTeacher()
  const [created, setCreated] = useState<TeacherAccount | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (values: FormValues) => {
    createTeacher.mutate(
      {
        username: values.username,
        email: values.email,
        fullName: values.fullName,
        phone: values.phone?.trim() || undefined,
        bio: values.bio?.trim() || undefined,
        password: values.password?.trim() ? values.password : undefined,
      },
      {
        onSuccess: (teacher) => {
          if (teacher.temporaryPassword) {
            setCreated(teacher)
          } else {
            onClose()
          }
        },
      },
    )
  }

  if (created?.temporaryPassword) {
    return (
      <DialogContent
        title="Đã tạo tài khoản giảng viên"
        description={`Tài khoản @${created.username} đã sẵn sàng hoạt động.`}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Mật khẩu tạm chỉ hiển thị <strong>một lần duy nhất</strong>. Hãy sao chép và gửi cho
              giảng viên ngay.
            </span>
          </div>

          <div className="space-y-2 rounded-xl border bg-muted/50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tên đăng nhập</span>
              <code className="font-mono font-semibold text-foreground">{created.username}</code>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Mật khẩu tạm</span>
              <div className="flex items-center gap-2">
                <code
                  data-testid="temporary-password"
                  className="rounded-lg bg-surface px-2.5 py-1 font-mono text-sm font-bold text-primary"
                >
                  {created.temporaryPassword}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(created.temporaryPassword ?? '').catch(() => {})
                    setCopied(true)
                  }}
                >
                  {copied ? <Check className="text-success" /> : <Copy />}
                  {copied ? 'Đã chép' : 'Sao chép'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Hoàn tất
            </Button>
          </div>
        </div>
      </DialogContent>
    )
  }

  return (
    <DialogContent
      title="Tạo tài khoản giảng viên"
      description="Bỏ trống mật khẩu nếu muốn hệ thống tự tạo mật khẩu tạm ngẫu nhiên."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên đăng nhập" htmlFor="teacher-username" error={errors.username?.message}>
            <Input
              id="teacher-username"
              placeholder="nguyenvana"
              aria-invalid={!!errors.username}
              {...register('username')}
            />
          </Field>
          <Field label="Email" htmlFor="teacher-email" error={errors.email?.message}>
            <Input
              id="teacher-email"
              type="email"
              placeholder="teacher@example.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên" htmlFor="teacher-fullname" error={errors.fullName?.message}>
            <Input
              id="teacher-fullname"
              placeholder="Nguyễn Văn A"
              aria-invalid={!!errors.fullName}
              {...register('fullName')}
            />
          </Field>
          <Field label="Số điện thoại" htmlFor="teacher-phone" error={errors.phone?.message}>
            <Input
              id="teacher-phone"
              placeholder="0901234567"
              aria-invalid={!!errors.phone}
              {...register('phone')}
            />
          </Field>
        </div>

        <Field label="Mật khẩu (tùy chọn)" htmlFor="teacher-password" error={errors.password?.message}>
          <Input
            id="teacher-password"
            type="password"
            placeholder="Để trống để hệ thống tự tạo"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>

        <Field label="Giới thiệu (tùy chọn)" htmlFor="teacher-bio" error={errors.bio?.message}>
          <Textarea
            id="teacher-bio"
            placeholder="Chuyên môn, kinh nghiệm giảng dạy IELTS..."
            aria-invalid={!!errors.bio}
            {...register('bio')}
          />
        </Field>

        {createTeacher.error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {errorMessage(createTeacher.error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={createTeacher.isPending}>
            Hủy
          </Button>
          <Button type="submit" loading={createTeacher.isPending}>
            Tạo tài khoản
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
