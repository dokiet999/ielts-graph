import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { AuthShell } from './AuthShell'

const schema = z.object({
  email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: ({ accessToken, user }) => {
      setAuth(accessToken, user)
      navigate(from, { replace: true })
    },
  })

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay lại! Tiếp tục hành trình IELTS của bạn."
    >
      <form onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="ban@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>
        <Field label="Mật khẩu" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        {login.error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {errorMessage(login.error)}
          </p>
        )}
        <Button type="submit" className="w-full" loading={login.isPending}>
          Đăng nhập
        </Button>
      </form>

      {import.meta.env.VITE_USE_MOCK !== 'false' && (
        <button
          type="button"
          className="mt-4 w-full rounded-xl border border-dashed px-3 py-2.5 text-left text-xs text-muted-foreground hover:bg-muted"
          onClick={() => {
            setValue('email', 'demo@ielts.dev')
            setValue('password', '123456')
          }}
        >
          Chế độ demo: <span className="font-medium text-foreground">demo@ielts.dev / 123456</span>{' '}
          (bấm để điền)
        </button>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </AuthShell>
  )
}
