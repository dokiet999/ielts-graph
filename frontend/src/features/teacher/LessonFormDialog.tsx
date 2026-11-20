import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { errorMessage } from '@/lib/api'
import { useCreateLesson, useUpdateLesson } from '@/lib/queries'
import type { AdminLessonItem } from '@/lib/types'

const LESSON_TYPES = ['VIDEO', 'DOCUMENT', 'TEXT'] as const

const schema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tên bài học').max(512),
  lessonType: z.enum(LESSON_TYPES),
  videoUrl: z.string().trim().max(512, 'URL tối đa 512 ký tự').optional(),
  videoDurationMinutes: z
    .string()
    .trim()
    .refine(
      (v) => v.length === 0 || (/^\d+$/.test(v) && Number(v) >= 0),
      'Thời lượng phải là số nguyên không âm',
    ),
  documentUrl: z.string().trim().max(512, 'URL tối đa 512 ký tự').optional(),
  ordering: z
    .string()
    .trim()
    .refine(
      (v) => v.length === 0 || (/^\d+$/.test(v) && Number(v) >= 0),
      'Thứ tự phải là số nguyên không âm',
    ),
  isPreview: z.boolean(),
})

type FormValues = z.infer<typeof schema>

export function LessonFormDialog({
  sectionId,
  lesson,
  open,
  onOpenChange,
}: {
  sectionId: string
  lesson?: AdminLessonItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <LessonFormBody
          key={lesson?.id ?? `create-${sectionId}`}
          sectionId={sectionId}
          lesson={lesson ?? null}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  )
}

function LessonFormBody({
  sectionId,
  lesson,
  onClose,
}: {
  sectionId: string
  lesson: AdminLessonItem | null
  onClose: () => void
}) {
  const isEdit = !!lesson
  const createLesson = useCreateLesson()
  const updateLesson = useUpdateLesson()
  const mutation = isEdit ? updateLesson : createLesson

  const normalizedType: (typeof LESSON_TYPES)[number] =
    lesson?.lessonType === 'DOCUMENT' || lesson?.lessonType === 'TEXT'
      ? lesson.lessonType
      : 'VIDEO'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: lesson?.title ?? '',
      lessonType: normalizedType,
      videoUrl: lesson?.videoUrl ?? '',
      videoDurationMinutes:
        lesson?.videoDuration && lesson.videoDuration > 0
          ? String(Math.ceil(lesson.videoDuration / 60))
          : '',
      documentUrl: lesson?.documentUrl ?? '',
      ordering: lesson ? String(lesson.ordering) : '',
      isPreview: lesson?.isPreview ?? false,
    },
  })

  const onSubmit = (values: FormValues) => {
    const body = {
      title: values.title,
      lessonType: values.lessonType,
      videoUrl: values.videoUrl?.trim() || undefined,
      videoDuration:
        values.videoDurationMinutes.length > 0
          ? Number(values.videoDurationMinutes) * 60
          : undefined,
      documentUrl: values.documentUrl?.trim() || undefined,
      ordering: values.ordering.length > 0 ? Number(values.ordering) : undefined,
      isPreview: values.isPreview,
    }
    if (lesson) {
      updateLesson.mutate({ id: lesson.id, body }, { onSuccess: onClose })
    } else {
      createLesson.mutate({ sectionId, body }, { onSuccess: onClose })
    }
  }

  return (
    <DialogContent
      title={isEdit ? 'Chỉnh sửa bài học' : 'Thêm bài học mới'}
      description="Bài học mới luôn ở trạng thái Bản nháp và chỉ hiển thị cho học viên sau khi được phê duyệt."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {lesson?.status === 'APPROVED' && (
          <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-3.5 py-3 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Bài học này đang ở trạng thái <strong>Đã duyệt</strong>. Khi lưu thay đổi, bài học sẽ
              tự động chuyển về <strong>Bản nháp</strong> và cần gửi duyệt lại trước khi hiển thị
              cho học viên.
            </span>
          </div>
        )}

        <Field label="Tên bài học" htmlFor="lesson-title" error={errors.title?.message}>
          <Input
            id="lesson-title"
            placeholder="Ví dụ: True / False / Not Given Strategies"
            aria-invalid={!!errors.title}
            {...register('title')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Loại bài học" htmlFor="lesson-type">
            <Select id="lesson-type" {...register('lessonType')}>
              <option value="VIDEO">VIDEO</option>
              <option value="DOCUMENT">DOCUMENT</option>
              <option value="TEXT">TEXT</option>
            </Select>
          </Field>

          <Field
            label="Thời lượng video (phút)"
            htmlFor="lesson-duration"
            error={errors.videoDurationMinutes?.message}
          >
            <Input
              id="lesson-duration"
              type="number"
              min={0}
              placeholder="15"
              aria-invalid={!!errors.videoDurationMinutes}
              {...register('videoDurationMinutes')}
            />
          </Field>
        </div>

        <Field
          label="URL video (tùy chọn)"
          htmlFor="lesson-video-url"
          error={errors.videoUrl?.message}
        >
          <Input
            id="lesson-video-url"
            placeholder="https://example.com/videos/lesson.mp4"
            aria-invalid={!!errors.videoUrl}
            {...register('videoUrl')}
          />
        </Field>

        <Field
          label="URL tài liệu (tùy chọn)"
          htmlFor="lesson-doc-url"
          error={errors.documentUrl?.message}
        >
          <Input
            id="lesson-doc-url"
            placeholder="https://example.com/docs/handout.pdf"
            aria-invalid={!!errors.documentUrl}
            {...register('documentUrl')}
          />
        </Field>

        <div className="grid items-end gap-4 sm:grid-cols-2">
          <Field
            label="Thứ tự (để trống để xếp cuối)"
            htmlFor="lesson-ordering"
            error={errors.ordering?.message}
          >
            <Input
              id="lesson-ordering"
              type="number"
              min={0}
              placeholder="Tự động"
              aria-invalid={!!errors.ordering}
              {...register('ordering')}
            />
          </Field>

          <label className="flex h-11 cursor-pointer items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-primary"
              {...register('isPreview')}
            />
            <span>Cho phép học thử miễn phí</span>
          </label>
        </div>

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
            {isEdit ? 'Lưu bài học' : 'Thêm bài học'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
