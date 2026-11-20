import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { DEMO_MODE } from '@/lib/demo'
import { homePathForRole } from '@/lib/moderation'
import type { Role } from '@/lib/types'
import { useAuthStore } from '@/stores/auth'

export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

export function RequireRole({ allow }: { allow: Role[] }) {
  const user = useAuthStore((s) => s.user)
  if (!user || !allow.includes(user.role)) {
    return <Navigate to={homePathForRole(user?.role)} replace />
  }
  return <Outlet />
}

export function GuestOnly() {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.user?.role)
  // Demo mode has no login or registration: always go straight to the app.
  return DEMO_MODE || token ? <Navigate to={homePathForRole(role)} replace /> : <Outlet />
}
