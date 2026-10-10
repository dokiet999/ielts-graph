import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, History, House, Menu, UserRound, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { DEMO_MODE } from '@/lib/demo'
import { cn } from '@/lib/utils'
import { ThemeToggle, UserMenu } from './UserMenu'

const NAV = [
  { to: '/', label: 'Trang chủ', icon: House, end: true },
  { to: '/courses', label: 'Khóa học', icon: BookOpen },
  { to: '/history', label: 'Lịch sử làm bài', icon: History },
  { to: '/profile', label: 'Hồ sơ', icon: UserRound },
].filter((item) => !(DEMO_MODE && item.to === '/profile'))

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-1 p-4" aria-label="Điều hướng chính">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors',
              isActive ? 'bg-primary-soft text-primary' : 'text-foreground/80 hover:bg-muted',
            )
          }
        >
          <Icon className="size-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-surface px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Mở menu"
          >
            <Menu />
          </Button>
          <Logo />
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-16 hidden w-64 border-r bg-surface lg:block">
        <SideNav />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Đóng">
                <X />
              </Button>
            </div>
            <SideNav onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="px-4 py-6 lg:ml-64 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
