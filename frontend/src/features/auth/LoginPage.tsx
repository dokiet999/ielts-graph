import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { api, errorMessage } from '@/lib/api'
import { homePathForRole } from '@/lib/moderation'
import { useAuthStore } from '@/stores/auth'
import { AuthShell } from './AuthShell'

const schema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email hoặc tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
})
type FormValues = z.infer<typeof schema>

const isMockMode = import.meta.env.VITE_USE_MOCK !== 'false'

const DEMO_ACCOUNTS = [
  {
    label: 'Học viên',
    account: isMockMode ? 'demo@ielts.dev' : 'student_enrolled',
    password: isMockMode ? '123456' : 'Demo@123',
  },
  {
    label: 'Giảng viên',
    account: 'teacher_demo',
    password: 'Demo@123',
  },
  {
    label: 'Quản trị viên',
    account: 'admin_demo',
    password: 'Demo@123',
  },
] as const

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
      const roleHome = homePathForRole(user.role)
      const canUseFrom =
        from &&
        from !== '/' &&
        (user.role === 'ADMIN'
          ? from.startsWith('/admin')
          : user.role === 'TEACHER'
            ? from.startsWith('/teacher')
            : !from.startsWith('/admin') && !from.startsWith('/teacher'))
      navigate(canUseFrom ? from : roleHome, { replace: true })
    },
  })

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Chào mừng bạn quay lại! Tiếp tục hành trình IELTS của bạn."
    >
      <form onSubmit={handleSubmit((v) => login.mutate(v))} className="space-y-4" noValidate>
        <Field label="Email hoặc tên đăng nhập" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="text"
            autoComplete="username"
            placeholder="admin_demo hoặc ban@example.com"
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

      <div className="mt-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Tài khoản demo (bấm để điền):</p>
        <div className="grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="rounded-xl border border-dashed px-2.5 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                setValue('email', item.account)
                setValue('password', item.password)
              }}
            >
              <span className="block font-semibold text-foreground">{item.label}</span>
              <span className="mt-0.5 block truncate">{item.account}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Đăng ký
        </Link>
      </p>
    </AuthShell>
  )
}
