import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-9', className)} aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <path d="M9 22 15 10l8 6" />
        <path d="M15 10l-1 12" />
      </g>
      <g fill="#fff">
        <circle cx="9" cy="22" r="3" />
        <circle cx="15" cy="10" r="3" />
        <circle cx="23" cy="16" r="3" />
        <circle cx="14" cy="22" r="2" />
      </g>
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="IELTS Graph - Trang chủ">
      <LogoMark />
      {!compact && (
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-tight">IELTS Graph</span>
          <span className="block text-[11px] font-medium text-muted-foreground">
            Learning Platform
          </span>
        </span>
      )}
    </Link>
  )
}
