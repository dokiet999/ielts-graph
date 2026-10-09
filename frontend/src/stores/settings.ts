import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const FONT_SIZES = [14, 16, 18, 20] as const

interface SettingsState {
  dark: boolean
  fontSize: (typeof FONT_SIZES)[number]
  toggleDark: () => void
  cycleFontSize: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      dark: false,
      fontSize: 16,
      toggleDark: () => set({ dark: !get().dark }),
      cycleFontSize: () => {
        const i = FONT_SIZES.indexOf(get().fontSize)
        set({ fontSize: FONT_SIZES[(i + 1) % FONT_SIZES.length] })
      },
    }),
    { name: 'ielts-settings' },
  ),
)
