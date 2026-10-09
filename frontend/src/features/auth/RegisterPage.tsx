import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { AuthShell } from './AuthShell'

const schema = z
  .object({
    fullName: z.string().trim().min(2, 'Vui lòng nhập họ tên'),
    email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Mật khẩu nhập lại không khớp',
  })
type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const signup = useMutation({
    mutationFn: api.register,
    onSuccess: ({ accessToken, user }) => {
      setAuth(accessToken, user)
      navigate('/', { replace: true })
    },
  })

  return (
    <AuthShell
      title="Tạo tài khoản"
      subtitle="Bắt đầu luyện IELTS Reading và Listening ngay hôm nay."
    >
      <form
        onSubmit={handleSubmit(({ fullName, email, password }) =>
          signup.mutate({ fullName, email, password }),
        )}
        className="space-y-4"
        noValidate
      >
        <Field label="Họ và tên" htmlFor="fullName" error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            {...register('fullName')}
          />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>
        <Field label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <Field label="Nhập lại mật khẩu" htmlFor="confirm" error={errors.confirm?.message}>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirm}
            {...register('confirm')}
          />
        </Field>
        {signup.error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {errorMessage(signup.error)}
          </p>
        )}
        <Button type="submit" className="w-full" loading={signup.isPending}>
          Đăng ký
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthShell>
  )
}
