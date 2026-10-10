import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, Moon, Sun, UserRound } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
} from '@/components/ui/menu'
import { DEMO_MODE } from '@/lib/demo'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

export function ThemeToggle() {
  const { dark, toggleDark } = useSettingsStore()
  return (
    <Tooltip content={dark ? 'Giao diện sáng' : 'Giao diện tối'}>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full"
        onClick={toggleDark}
        aria-label="Đổi giao diện sáng/tối"
      >
        {dark ? <Sun /> : <Moon />}
      </Button>
    </Tooltip>
  )
}

export function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const qc = useQueryClient()
  if (!user) return null

  // Demo mode has no profile page or logout: just show who is signed in.
  if (DEMO_MODE) {
    return (
      <div className="flex items-center gap-2" title="Chế độ demo">
        <Avatar name={user.fullName} src={user.avatarUrl} />
        <span className="hidden text-sm font-medium sm:inline">{user.fullName}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded-full ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Tài khoản"
        >
          <Avatar name={user.fullName} src={user.avatarUrl} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold">{user.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <UserRound /> Hồ sơ
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-danger"
          onSelect={() => {
            logout()
            qc.clear()
            navigate('/login')
          }}
        >
          <LogOut /> Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
