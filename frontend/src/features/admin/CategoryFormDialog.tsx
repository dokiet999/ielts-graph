import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { errorMessage } from '@/lib/api'
import { useCreateCategory, useUpdateCategory } from '@/lib/queries'
import type { Category } from '@/lib/types'

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên danh mục').max(255),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, 'Slug tối đa 255 ký tự')
    .refine(
      (v) => v.length === 0 || SLUG_REGEX.test(v),
      'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang (vd: academic-ielts)',
    ),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự').optional(),
  iconUrl: z.string().trim().max(512, 'URL tối đa 512 ký tự').optional(),
  ordering: z
    .string()
    .trim()
    .refine(
      (v) => /^\d+$/.test(v) && Number(v) >= 0,
      'Thứ tự hiển thị phải là số nguyên không âm',
    ),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function CategoryFormDialog({
  category,
  open,
  onOpenChange,
}: {
  category: Category | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CategoryFormBody
          key={category?.id ?? 'create'}
          category={category}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  )
}

function CategoryFormBody({
  category,
  onClose,
}: {
  category: Category | null
  onClose: () => void
}) {
  const isEdit = !!category
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const mutation = isEdit ? updateCategory : createCategory

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      iconUrl: category?.iconUrl ?? '',
      ordering: String(category?.ordering ?? 0),
      isActive: category?.isActive ?? true,
    },
  })

  const onSubmit = (values: FormValues) => {
    const body = {
      name: values.name,
      slug: values.slug || undefined,
      description: values.description?.trim() || undefined,
      iconUrl: values.iconUrl?.trim() || undefined,
      ordering: Number(values.ordering),
      isActive: values.isActive,
    }
    if (category) {
      updateCategory.mutate({ id: category.id, body }, { onSuccess: onClose })
    } else {
      createCategory.mutate(body, { onSuccess: onClose })
    }
  }

  return (
    <DialogContent
      title={isEdit ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
      description="Danh mục giúp phân loại khóa học theo mục tiêu và chương trình IELTS."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tên danh mục" htmlFor="category-name" error={errors.name?.message}>
            <Input
              id="category-name"
              placeholder="IELTS Academic"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
          </Field>
          <Field label="Slug (để trống để tự tạo)" htmlFor="category-slug" error={errors.slug?.message}>
            <Input
              id="category-slug"
              placeholder="ielts-academic"
              aria-invalid={!!errors.slug}
              {...register('slug')}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thứ tự hiển thị" htmlFor="category-ordering" error={errors.ordering?.message}>
            <Input
              id="category-ordering"
              type="number"
              min={0}
              aria-invalid={!!errors.ordering}
              {...register('ordering')}
            />
          </Field>
          <Field label="URL biểu tượng (tùy chọn)" htmlFor="category-icon" error={errors.iconUrl?.message}>
            <Input
              id="category-icon"
              placeholder="https://example.com/icon.svg"
              aria-invalid={!!errors.iconUrl}
              {...register('iconUrl')}
            />
          </Field>
        </div>

        <Field label="Mô tả (tùy chọn)" htmlFor="category-description" error={errors.description?.message}>
          <Textarea
            id="category-description"
            placeholder="Mô tả ngắn gọn về nhóm khóa học thuộc danh mục này..."
            aria-invalid={!!errors.description}
            {...register('description')}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            className="size-4 rounded border-input accent-primary"
            {...register('isActive')}
          />
          <span>Hiển thị danh mục này cho giảng viên và học viên</span>
        </label>

        {mutation.error && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {errorMessage(mutation.error)}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Hủy
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo danh mục'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
