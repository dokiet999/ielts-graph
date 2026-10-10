import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { z } from 'zod'
import { PageTitle } from '@/components/PageHeading'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'

const schema = z.object({
  fullName: z.string().trim().min(2, 'Vui lòng nhập họ tên'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?\d[\d\s]{7,14})?$/, 'Số điện thoại không hợp lệ'),
  avatarUrl: z.union([z.literal(''), z.string().trim().url('Đường dẫn ảnh không hợp lệ')]),
  bio: z.string().max(500, 'Tối đa 500 ký tự'),
})
type FormValues = z.infer<typeof schema>

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)!
  const setUser = useAuthStore((s) => s.setUser)
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user.fullName,
      phone: user.phone ?? '',
      avatarUrl: user.avatarUrl ?? '',
      bio: user.bio ?? '',
    },
  })

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      api.updateMe({
        fullName: v.fullName,
        phone: v.phone || null,
        avatarUrl: v.avatarUrl || null,
        bio: v.bio || null,
      }),
    onSuccess: (updated) => {
      setUser(updated)
      reset({
        fullName: updated.fullName,
        phone: updated.phone ?? '',
        avatarUrl: updated.avatarUrl ?? '',
        bio: updated.bio ?? '',
      })
    },
  })

  const avatar = watch('avatarUrl')
  const name = watch('fullName')

  return (
    <div className="max-w-2xl">
      <PageTitle title="Hồ sơ" subtitle="Thông tin cá nhân của bạn." />
      <form
        onSubmit={handleSubmit((v) => save.mutate(v))}
        className="card space-y-5 p-6"
        noValidate
      >
        <div className="flex items-center gap-4">
          <Avatar name={name || user.fullName} src={avatar || null} className="size-16 text-lg" />
          <div>
            <p className="font-semibold">{user.email}</p>
            <p className="text-sm text-muted-foreground">Học viên</p>
          </div>
        </div>
        <Field label="Họ và tên" htmlFor="fullName" error={errors.fullName?.message}>
          <Input id="fullName" aria-invalid={!!errors.fullName} {...register('fullName')} />
        </Field>
        <Field label="Số điện thoại" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" aria-invalid={!!errors.phone} {...register('phone')} />
        </Field>
        <Field label="Ảnh đại diện (URL)" htmlFor="avatarUrl" error={errors.avatarUrl?.message}>
          <Input
            id="avatarUrl"
            placeholder="https://..."
            aria-invalid={!!errors.avatarUrl}
            {...register('avatarUrl')}
          />
        </Field>
        <Field label="Giới thiệu" htmlFor="bio" error={errors.bio?.message}>
          <Textarea
            id="bio"
            placeholder="Mục tiêu band, thời gian thi dự kiến..."
            aria-invalid={!!errors.bio}
            {...register('bio')}
          />
        </Field>
        {save.error && <p className="text-sm text-danger">{errorMessage(save.error)}</p>}
        <div className="flex items-center justify-end gap-3">
          {save.isSuccess && !isDirty && (
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="size-4" /> Đã lưu
            </span>
          )}
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  )
}
