import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEMO_MODE, demoUser } from '@/lib/demo'
import type { User } from '@/lib/types'

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // In demo mode the user is fixed and the token is only a "logged in" marker.
      token: DEMO_MODE ? 'demo' : null,
      user: DEMO_MODE ? demoUser : null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'ielts-auth',
      // Ignore anything saved by a previous (mock login) session while in demo mode.
      merge: (persisted, current) =>
        DEMO_MODE ? current : { ...current, ...(persisted as object) },
    },
  ),
)
