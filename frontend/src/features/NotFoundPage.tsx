import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'

export function NotFoundPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <EmptyState
        icon={Compass}
        title="Không tìm thấy trang"
        description="Trang bạn tìm không tồn tại hoặc đã được di chuyển."
        className="w-full max-w-lg bg-surface"
        action={
          <Button asChild>
            <Link to="/">Về trang chủ</Link>
          </Button>
        }
      />
    </div>
  )
}
