import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'

export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

export function GuestOnly() {
  const token = useAuthStore((s) => s.token)
  return token ? <Navigate to="/" replace /> : <Outlet />
}
