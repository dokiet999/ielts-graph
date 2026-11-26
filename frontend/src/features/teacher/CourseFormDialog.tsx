import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { errorMessage } from '@/lib/api'
import { useCategories, useCreateCourse, useUpdateCourse } from '@/lib/queries'
import type { AdminCourseDetail, DifficultyLevel, SkillType } from '@/lib/types'
import { LEVEL_LABEL, SKILL_LABEL } from '@/lib/utils'

export interface EditableCourseValues {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  categoryId?: string | null
  categoryName?: string | null
  skillFocus?: SkillType | null
  difficultyLevel?: DifficultyLevel | null
  estimatedDuration?: number | null
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
}

function toDateTimeInputValue(iso?: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

function toBackendLocalDateTime(value?: string): string | undefined {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed
}

const SKILLS: SkillType[] = ['READING', 'LISTENING', 'WRITING', 'SPEAKING']
const LEVELS: DifficultyLevel[] = [
  'BEGINNER',
  'ELEMENTARY',
  'INTERMEDIATE',
  'UPPER_INTERMEDIATE',
  'ADVANCED',
]

const schema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tên khóa học').max(512),
    categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
    skillFocus: z.enum(['READING', 'LISTENING', 'WRITING', 'SPEAKING']),
    difficultyLevel: z.enum([
      'BEGINNER',
      'ELEMENTARY',
      'INTERMEDIATE',
      'UPPER_INTERMEDIATE',
      'ADVANCED',
    ]),
    estimatedDuration: z
      .string()
      .trim()
      .refine(
        (v) => v.length === 0 || (/^\d+$/.test(v) && Number(v) > 0),
        'Thời lượng dự kiến phải là số nguyên dương',
      ),
    maxStudents: z
      .string()
      .trim()
      .refine(
        (v) => v.length === 0 || (/^\d+$/.test(v) && Number(v) > 0),
        'Số học viên tối đa phải là số nguyên dương',
      ),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    thumbnail: z.string().trim().max(512, 'URL tối đa 512 ký tự').optional(),
    description: z.string().trim().max(5000, 'Mô tả tối đa 5000 ký tự').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate).getTime()
      const end = new Date(data.endDate).getTime()
      if (!Number.isNaN(start) && !Number.isNaN(end) && end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
        })
      }
    }
  })

type FormValues = z.infer<typeof schema>

export function CourseFormDialog({
  course,
  open,
  onOpenChange,
  onCreated,
}: {
  course?: EditableCourseValues | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (course: AdminCourseDetail) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CourseFormBody
          key={course?.id ?? 'create'}
          course={course ?? null}
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      )}
    </Dialog>
  )
}

function CourseFormBody({
  course,
  onClose,
  onCreated,
}: {
  course: EditableCourseValues | null
  onClose: () => void
  onCreated?: (course: AdminCourseDetail) => void
}) {
  const isEdit = !!course
  const categories = useCategories()
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const mutation = isEdit ? updateCourse : createCourse

  const activeCategories = categories.data ?? []
  const missingExistingCategory =
    course?.categoryId &&
    course.categoryName &&
    !activeCategories.some((c) => c.id === course.categoryId)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: course?.title ?? '',
      categoryId: course?.categoryId ?? '',
      skillFocus: course?.skillFocus ?? 'READING',
      difficultyLevel: course?.difficultyLevel ?? 'INTERMEDIATE',
      estimatedDuration: course?.estimatedDuration ? String(course.estimatedDuration) : '',
      maxStudents: course?.maxStudents ? String(course.maxStudents) : '',
      startDate: toDateTimeInputValue(course?.startDate),
      endDate: toDateTimeInputValue(course?.endDate),
      thumbnail: course?.thumbnail ?? '',
      description: course?.description ?? '',
    },
  })

  const onSubmit = (values: FormValues) => {
    const body = {
      categoryId: values.categoryId,
      title: values.title,
      skillFocus: values.skillFocus,
      difficultyLevel: values.difficultyLevel,
      estimatedDuration: values.estimatedDuration
        ? Number(values.estimatedDuration)
        : undefined,
      maxStudents: values.maxStudents ? Number(values.maxStudents) : undefined,
      startDate: toBackendLocalDateTime(values.startDate),
      endDate: toBackendLocalDateTime(values.endDate),
      thumbnail: values.thumbnail?.trim() || undefined,
      description: values.description?.trim() || undefined,
    }
    if (course) {
      updateCourse.mutate({ id: course.id, body }, { onSuccess: onClose })
    } else {
      createCourse.mutate(body, {
        onSuccess: (created) => {
          onClose()
          onCreated?.(created)
        },
      })
    }
  }

  return (
    <DialogContent
      title={isEdit ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
      description="Khóa học mới luôn bắt đầu ở trạng thái Bản nháp để bạn xây dựng chương và bài học trước khi gửi duyệt."
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Tên khóa học" htmlFor="course-title" error={errors.title?.message}>
          <Input
            id="course-title"
            placeholder="Ví dụ: IELTS Reading Mastery Band 7.5+"
            aria-invalid={!!errors.title}
            {...register('title')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Danh mục" htmlFor="course-category" error={errors.categoryId?.message}>
            <Select
              id="course-category"
              aria-invalid={!!errors.categoryId}
              {...register('categoryId')}
            >
              <option value="">-- Chọn danh mục --</option>
              {missingExistingCategory && course?.categoryId && (
                <option value={course.categoryId}>{course.categoryName}</option>
              )}
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Kỹ năng trọng tâm" htmlFor="course-skill" error={errors.skillFocus?.message}>
            <Select id="course-skill" {...register('skillFocus')}>
              {SKILLS.map((sk) => (
                <option key={sk} value={sk}>
                  {SKILL_LABEL[sk]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Trình độ" htmlFor="course-level" error={errors.difficultyLevel?.message}>
            <Select id="course-level" {...register('difficultyLevel')}>
              {LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  {LEVEL_LABEL[lv]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Thời lượng dự kiến (phút)"
            htmlFor="course-duration"
            error={errors.estimatedDuration?.message}
          >
            <Input
              id="course-duration"
              type="number"
              min={1}
              placeholder="360"
              aria-invalid={!!errors.estimatedDuration}
              {...register('estimatedDuration')}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Sĩ số tối đa (tùy chọn)"
            htmlFor="course-max-students"
            error={errors.maxStudents?.message}
          >
            <Input
              id="course-max-students"
              type="number"
              min={1}
              placeholder="Không giới hạn"
              aria-invalid={!!errors.maxStudents}
              {...register('maxStudents')}
            />
          </Field>

          <Field
            label="Ngày bắt đầu (tùy chọn)"
            htmlFor="course-start-date"
            error={errors.startDate?.message}
          >
            <Input
              id="course-start-date"
              type="datetime-local"
              aria-invalid={!!errors.startDate}
              {...register('startDate')}
            />
          </Field>

          <Field
            label="Ngày kết thúc (tùy chọn)"
            htmlFor="course-end-date"
            error={errors.endDate?.message}
          >
            <Input
              id="course-end-date"
              type="datetime-local"
              aria-invalid={!!errors.endDate}
              {...register('endDate')}
            />
          </Field>
        </div>

        <Field
          label="URL ảnh bìa (tùy chọn)"
          htmlFor="course-thumbnail"
          error={errors.thumbnail?.message}
        >
          <Input
            id="course-thumbnail"
            placeholder="https://example.com/images/course-cover.jpg"
            aria-invalid={!!errors.thumbnail}
            {...register('thumbnail')}
          />
        </Field>

        <Field
          label="Mô tả khóa học (tùy chọn)"
          htmlFor="course-description"
          error={errors.description?.message}
        >
          <Textarea
            id="course-description"
            placeholder="Giới thiệu mục tiêu, đối tượng học viên và kết quả đạt được..."
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
            {isEdit ? 'Lưu khóa học' : 'Tạo khóa học'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
