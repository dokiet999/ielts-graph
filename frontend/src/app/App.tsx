import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/menu'
import { useSettingsStore } from '@/stores/settings'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

function ThemeSync() {
  const dark = useSettingsStore((s) => s.dark)
  const fontSize = useSettingsStore((s) => s.fontSize)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  useEffect(() => {
    document.documentElement.style.setProperty('--reading-font-size', `${fontSize}px`)
  }, [fontSize])
  return null
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <ThemeSync />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
