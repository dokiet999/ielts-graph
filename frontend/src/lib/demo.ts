import type { Role, User } from './types'

// Demo mode: until the backend has real login (JWT), the app skips the login page and sends
// HTTP Basic credentials taken from the environment. The password lives in a VITE_ variable,
// so this must only be used for local demos and never deployed.
const demoUsername = import.meta.env.VITE_DEMO_USER
const demoPassword = import.meta.env.VITE_DEMO_PASSWORD ?? ''

export const DEMO_MODE = !!demoUsername

function inferDemoRole(username?: string): Role {
  const explicit = import.meta.env.VITE_DEMO_ROLE?.toUpperCase()
  if (explicit === 'ADMIN' || explicit === 'TEACHER' || explicit === 'STUDENT') {
    return explicit
  }
  const normalized = username?.toLowerCase() ?? ''
  if (normalized.startsWith('admin')) return 'ADMIN'
  if (normalized.startsWith('teacher')) return 'TEACHER'
  return 'STUDENT'
}

export const demoUser: User = {
  id: 'demo',
  username: demoUsername,
  email: '',
  fullName: import.meta.env.VITE_DEMO_FULLNAME ?? demoUsername ?? 'Demo',
  avatarUrl: null,
  bio: null,
  phone: null,
  role: inferDemoRole(demoUsername),
}

/** `Authorization` header value for the demo account (HTTP Basic). */
export const demoAuthHeader = DEMO_MODE ? `Basic ${btoa(`${demoUsername}:${demoPassword}`)}` : null
