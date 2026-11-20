import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  Menu,
  Tags,
  Users,
  X,
} from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThemeToggle, UserMenu } from './UserMenu'

export interface RoleNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

function SideNav({ items, onNavigate }: { items: RoleNavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1 p-4" aria-label="Điều hướng">
      {items.map(({ to, label, icon: Icon, end }) => (
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
          <Icon className="size-5 shrink-0" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function RoleShellLayout({
  nav,
  roleLabel,
  roleTone,
  homeTo,
  subtitle,
}: {
  nav: RoleNavItem[]
  roleLabel: string
  roleTone: 'primary' | 'info'
  homeTo: string
  subtitle: string
}) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-surface px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Mở menu"
          >
            <Menu />
          </Button>
          <Logo to={homeTo} subtitle={subtitle} />
          <Badge tone={roleTone} className="hidden sm:inline-flex">
            {roleLabel}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-16 hidden w-64 border-r bg-surface lg:block">
        <SideNav items={nav} />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Logo to={homeTo} subtitle={subtitle} />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Đóng">
                <X />
              </Button>
            </div>
            <SideNav items={nav} onNavigate={() => setOpen(false)} />
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

const ADMIN_NAV: RoleNavItem[] = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/reviews', label: 'Kiểm duyệt nội dung', icon: ClipboardCheck },
  { to: '/admin/courses', label: 'Quản lý khóa học', icon: BookOpen },
  { to: '/admin/categories', label: 'Danh mục', icon: Tags },
  { to: '/admin/teachers', label: 'Giảng viên', icon: Users },
  { to: '/admin/students', label: 'Học viên', icon: GraduationCap },
]

const TEACHER_NAV: RoleNavItem[] = [
  { to: '/teacher', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/teacher/courses', label: 'Khóa học của tôi', icon: BookOpen },
]

export function AdminLayout() {
  return (
    <RoleShellLayout
      nav={ADMIN_NAV}
      roleLabel="Quản trị viên"
      roleTone="primary"
      homeTo="/admin"
      subtitle="Cổng quản trị"
    />
  )
}

export function TeacherLayout() {
  return (
    <RoleShellLayout
      nav={TEACHER_NAV}
      roleLabel="Giảng viên"
      roleTone="info"
      homeTo="/teacher"
      subtitle="Cổng giảng viên"
    />
  )
}
