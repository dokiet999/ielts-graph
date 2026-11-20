import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { errorMessage } from '@/lib/api'
import { useCreateSection, useUpdateSection } from '@/lib/queries'

export interface EditableSectionValues {
  id: string
  title: string
  description?: string | null
  ordering: number
}

const schema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tên chương').max(512),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự').optional(),
  ordering: z
    .string()
    .trim()
    .refine(
      (v) => v.length === 0 || (/^\d+$/.test(v) && Number(v) >= 0),
      'Thứ tự phải là số nguyên không âm',
    ),
})

type FormValues = z.infer<typeof schema>

export function SectionFormDialog({
  courseId,
  section,
  open,
  onOpenChange,
}: {
  courseId: string
  section?: EditableSectionValues | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <SectionFormBody
          key={section?.id ?? 'create'}
          courseId={courseId}
          section={section ?? null}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  )
}

function SectionFormBody({
  courseId,
  section,
  onClose,
}: {
  courseId: string
  section: EditableSectionValues | null
  onClose: () => void
}) {
  const isEdit = !!section
  const createSection = useCreateSection()
  const updateSection = useUpdateSection()
  const mutation = isEdit ? updateSection : createSection

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: section?.title ?? '',
      description: section?.description ?? '',
      ordering: section ? String(section.ordering) : '',
    },
  })

  const onSubmit = (values: FormValues) => {
    const body = {
      title: values.title,
      description: values.description?.trim() || undefined,
      ordering: values.ordering.length > 0 ? Number(values.ordering) : undefined,
    }
    if (section) {
      updateSection.mutate({ id: section.id, body }, { onSuccess: onClose })
    } else {
      createSection.mutate({ courseId, body }, { onSuccess: onClose })
    }
  }

  return (
    <DialogContent
      title={isEdit ? 'Chỉnh sửa chương học' : 'Thêm chương học mới'}
      description="Sắp xếp khóa học thành các chương logic để học viên dễ theo dõi."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Tên chương" htmlFor="section-title" error={errors.title?.message}>
          <Input
            id="section-title"
            placeholder="Ví dụ: Chương 1 — Kỹ thuật đọc lướt"
            aria-invalid={!!errors.title}
            {...register('title')}
          />
        </Field>

        <Field
          label="Thứ tự hiển thị (để trống để xếp cuối)"
          htmlFor="section-ordering"
          error={errors.ordering?.message}
        >
          <Input
            id="section-ordering"
            type="number"
            min={0}
            placeholder="Tự động"
            aria-invalid={!!errors.ordering}
            {...register('ordering')}
          />
        </Field>

        <Field
          label="Mô tả (tùy chọn)"
          htmlFor="section-description"
          error={errors.description?.message}
        >
          <Textarea
            id="section-description"
            placeholder="Nội dung trọng tâm của chương học..."
            aria-invalid={!!errors.description}
            {...register('description')}
          />
        </Field>

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
            {isEdit ? 'Lưu chương' : 'Thêm chương'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
