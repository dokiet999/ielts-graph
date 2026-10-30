import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  itemLabel?: string
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = 'bài luyện',
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, totalItems)

  const pages: number[] = []
  for (let p = 1; p <= totalPages; p++) {
    pages.push(p)
  }

  return (
    <nav
      aria-label="Phân trang"
      className={cn(
        'mt-8 flex flex-col items-center justify-between gap-4 border-t pt-5 sm:flex-row',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Hiển thị <span className="font-medium text-foreground">{start}</span>–
        <span className="font-medium text-foreground">{end}</span> trên{' '}
        <span className="font-medium text-foreground">{totalItems}</span> {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" /> Trước
        </Button>

        {pages.map((p) => (
          <Button
            key={p}
            variant={p === safePage ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onPageChange(p)}
            aria-label={`Trang ${p}`}
            aria-current={p === safePage ? 'page' : undefined}
            className="min-w-9 px-2.5"
          >
            {p}
          </Button>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Trang tiếp"
        >
          Tiếp <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
