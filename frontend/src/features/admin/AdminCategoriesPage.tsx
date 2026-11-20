import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import {
  useAdminCategories,
  useDeleteCategory,
  useUpdateCategory,
} from '@/lib/queries'
import type { Category } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { CategoryFormDialog } from './CategoryFormDialog'
import { ConfirmActionDialog } from './ModerationDialogs'

export function AdminCategoriesPage() {
  const [params, setParams] = useSearchParams()
  const rawActive = params.get('isActive') ?? ''
  const isActive: boolean | undefined =
    rawActive === 'true' ? true : rawActive === 'false' ? false : undefined
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const [searchInput, setSearchInput] = useState(q)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const categories = useAdminCategories({ isActive, q, page, size: 10 })
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const updateParams = (next: { isActive?: string; q?: string; page?: number }) => {
    const mergedActive = next.isActive !== undefined ? next.isActive : rawActive
    const mergedQ = next.q !== undefined ? next.q : q
    const mergedPage = next.page ?? 1
    const nextParams = new URLSearchParams()
    if (mergedActive === 'true' || mergedActive === 'false') nextParams.set('isActive', mergedActive)
    if (mergedQ.trim()) nextParams.set('q', mergedQ.trim())
    if (mergedPage > 1) nextParams.set('page', String(mergedPage))
    setParams(nextParams)
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Quản lý danh mục"
          subtitle="Tạo, chỉnh sửa, ẩn/hiện và sắp xếp các danh mục khóa học IELTS."
        />
        <Button
          onClick={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
          className="shrink-0 self-start"
        >
          <Plus /> Thêm danh mục
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          updateParams({ q: searchInput, page: 1 })
        }}
        className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên hoặc slug danh mục..."
            aria-label="Tìm kiếm danh mục"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Lọc trạng thái danh mục"
          value={rawActive}
          onChange={(e) => updateParams({ isActive: e.target.value, page: 1 })}
          className="sm:w-52"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hiển thị</option>
          <option value="false">Đang ẩn</option>
        </Select>
        <Button type="submit" variant="outline">
          Tìm kiếm
        </Button>
      </form>

      {categories.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : categories.error ? (
        <ErrorState message={errorMessage(categories.error)} onRetry={() => categories.refetch()} />
      ) : !categories.data?.items.length ? (
        <EmptyState
          icon={Tags}
          title="Không tìm thấy danh mục nào"
          description="Thử xóa bộ lọc tìm kiếm hoặc thêm danh mục khóa học mới."
          className="bg-surface"
        />
      ) : (
        <>
          <div className="space-y-3">
            {categories.data.items.map((cat) => (
              <div
                key={cat.id}
                className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{cat.name}</h3>
                    <Badge tone={cat.isActive ? 'success' : 'neutral'}>
                      {cat.isActive ? 'Đang hiển thị' : 'Đang ẩn'}
                    </Badge>
                    <Badge tone="info">{cat.courseCount} khóa học</Badge>
                    <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                      /{cat.slug}
                    </span>
                  </div>
                  {cat.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{cat.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Thứ tự: {cat.ordering} · Cập nhật: {formatDate(cat.updatedAt)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditTarget(cat)
                      setFormOpen(true)
                    }}
                  >
                    <Pencil /> Chỉnh sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateCategory.isPending}
                    onClick={() =>
                      updateCategory.mutate({
                        id: cat.id,
                        body: {
                          name: cat.name,
                          slug: cat.slug,
                          description: cat.description ?? undefined,
                          iconUrl: cat.iconUrl ?? undefined,
                          ordering: cat.ordering,
                          isActive: !cat.isActive,
                        },
                      })
                    }
                  >
                    {cat.isActive ? <EyeOff /> : <Eye />}
                    {cat.isActive ? 'Ẩn' : 'Hiển thị'}
                  </Button>
                  <Button
                    size="sm"
                    variant="dangerSoft"
                    onClick={() => {
                      deleteCategory.reset()
                      setDeleteTarget(cat)
                    }}
                  >
                    <Trash2 /> Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={categories.data.page}
            totalPages={categories.data.totalPages}
            totalItems={categories.data.total}
            pageSize={categories.data.size}
            itemLabel="danh mục"
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </>
      )}

      <CategoryFormDialog
        category={editTarget}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditTarget(null)
        }}
      />

      <ConfirmActionDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title="Xóa danh mục"
        description={
          deleteTarget
            ? deleteTarget.courseCount > 0
              ? `Danh mục "${deleteTarget.name}" hiện đang gắn với ${deleteTarget.courseCount} khóa học. Hệ thống sẽ chặn xóa cứng — bạn nên dùng nút "Ẩn" thay thế.`
              : `Bạn có chắc muốn xóa vĩnh viễn danh mục "${deleteTarget.name}"?`
            : ''
        }
        confirmLabel="Xóa danh mục"
        confirmVariant="danger"
        loading={deleteCategory.isPending}
        error={deleteCategory.error ? errorMessage(deleteCategory.error) : null}
        onConfirm={() => {
          if (!deleteTarget) return
          deleteCategory.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          })
        }}
      />
    </div>
  )
}
