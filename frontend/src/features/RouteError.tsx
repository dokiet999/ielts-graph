import { Link, useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'

export function RouteError() {
  const error = useRouteError()
  if (import.meta.env.DEV) console.error(error)
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <EmptyState
        icon={AlertTriangle}
        title="Đã có lỗi xảy ra"
        description="Trang gặp sự cố ngoài ý muốn. Bài làm đang dở của bạn vẫn được lưu."
        className="w-full max-w-lg bg-surface"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Tải lại
            </Button>
            <Button asChild>
              <Link to="/">Về trang chủ</Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}
