import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { errorMessage } from '@/lib/api'
import { useUpdateTeacher } from '@/lib/queries'
import type { TeacherAccount } from '@/lib/types'

const schema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ').max(255),
  fullName: z.string().trim().min(1, 'Vui lòng nhập họ tên').max(255),
  phone: z.string().trim().max(20, 'Số điện thoại tối đa 20 ký tự').optional(),
  bio: z.string().trim().max(2000, 'Giới thiệu tối đa 2000 ký tự').optional(),
})

type FormValues = z.infer<typeof schema>

export function EditTeacherDialog({
  teacher,
  open,
  onOpenChange,
}: {
  teacher: TeacherAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && teacher && (
        <EditTeacherBody
          key={teacher.id}
          teacher={teacher}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  )
}

function EditTeacherBody({
  teacher,
  onClose,
}: {
  teacher: TeacherAccount
  onClose: () => void
}) {
  const updateTeacher = useUpdateTeacher()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: teacher.email,
      fullName: teacher.fullName,
      phone: teacher.phone ?? '',
      bio: teacher.bio ?? '',
    },
  })

  const onSubmit = (values: FormValues) => {
    updateTeacher.mutate(
      {
        id: teacher.id,
        body: {
          email: values.email,
          fullName: values.fullName,
          phone: values.phone?.trim() || undefined,
          bio: values.bio?.trim() || undefined,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <DialogContent
      title="Chỉnh sửa giảng viên"
      description={`Cập nhật hồ sơ cho tài khoản @${teacher.username}.`}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Tên đăng nhập" htmlFor="edit-teacher-username">
          <Input id="edit-teacher-username" value={`@${teacher.username}`} disabled />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên" htmlFor="edit-teacher-fullname" error={errors.fullName?.message}>
            <Input
              id="edit-teacher-fullname"
              aria-invalid={!!errors.fullName}
              {...register('fullName')}
            />
          </Field>
          <Field label="Email" htmlFor="edit-teacher-email" error={errors.email?.message}>
            <Input
              id="edit-teacher-email"
              type="email"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </Field>
        </div>

        <Field label="Số điện thoại" htmlFor="edit-teacher-phone" error={errors.phone?.message}>
          <Input
            id="edit-teacher-phone"
            placeholder="0901234567"
            aria-invalid={!!errors.phone}
            {...register('phone')}
          />
        </Field>

        <Field label="Giới thiệu (tùy chọn)" htmlFor="edit-teacher-bio" error={errors.bio?.message}>
          <Textarea
            id="edit-teacher-bio"
            placeholder="Chuyên môn, kinh nghiệm giảng dạy IELTS..."
            aria-invalid={!!errors.bio}
            {...register('bio')}
          />
        </Field>

        {updateTeacher.error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {errorMessage(updateTeacher.error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={updateTeacher.isPending}
          >
            Hủy
          </Button>
          <Button type="submit" loading={updateTeacher.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
