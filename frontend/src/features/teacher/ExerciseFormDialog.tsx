import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { errorMessage } from '@/lib/api'
import { useCreateExercise, useUpdateExercise } from '@/lib/queries'
import type {
  ExerciseType,
  SkillType,
  TeacherExerciseDetail,
  TeacherExerciseSummary,
} from '@/lib/types'
import { SKILL_LABEL } from '@/lib/utils'

const SKILLS: SkillType[] = ['READING', 'LISTENING', 'WRITING', 'SPEAKING']
const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: 'LESSON', label: 'Bài tập theo bài học (LESSON)' },
  { value: 'PRACTICE', label: 'Luyện tập (PRACTICE)' },
  { value: 'MOCK_TEST', label: 'Thi thử (MOCK_TEST)' },
  { value: 'FINAL_TEST', label: 'Kiểm tra cuối khóa (FINAL_TEST)' },
]

const schema = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tên bài tập').max(512),
  skillType: z.enum(['READING', 'LISTENING', 'WRITING', 'SPEAKING']),
  exerciseType: z.enum(['LESSON', 'PRACTICE', 'MOCK_TEST', 'FINAL_TEST']),
  timeLimitMinutes: z
    .string()
    .trim()
    .refine(
      (v) => v.length === 0 || (/^\d+$/.test(v) && Number(v) > 0),
      'Thời gian làm bài phải là số phút nguyên dương',
    ),
  maxAttempts: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1, 'Số lần làm tối thiểu là 1'),
  passingScore: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, 'Điểm đạt không được âm'),
  ordering: z
    .string()
    .trim()
    .refine(
      (v) => v.length === 0 || (/^\d+$/.test(v) && Number(v) >= 0),
      'Thứ tự phải là số nguyên không âm',
    ),
  audioUrl: z.string().trim().max(512, 'URL tối đa 512 ký tự').optional(),
  instruction: z.string().trim().max(5000).optional(),
})

type FormValues = z.infer<typeof schema>

function defaultContentForSkill(skill: SkillType): Record<string, unknown> {
  switch (skill) {
    case 'READING':
      return {
        passageTitle: '',
        subtitle: '',
        paragraphs: [{ label: 'A', text: '' }],
      }
    case 'LISTENING':
      return {
        sectionTitle: 'Section 1',
        transcript: [],
      }
    case 'WRITING':
      return { task: 'QT_W2_DISCUSSION' }
    case 'SPEAKING':
      return { part: 'QT_S_PART2', prompt: '' }
  }
}

export function ExerciseFormDialog({
  lessonId,
  exercise,
  defaultSkill,
  open,
  onOpenChange,
  onCreated,
}: {
  lessonId: string
  exercise?: TeacherExerciseSummary | null
  defaultSkill?: SkillType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (created: TeacherExerciseDetail) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ExerciseFormBody
          key={exercise?.id ?? `create-${lessonId}`}
          lessonId={lessonId}
          exercise={exercise ?? null}
          defaultSkill={defaultSkill ?? 'READING'}
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      )}
    </Dialog>
  )
}

function ExerciseFormBody({
  lessonId,
  exercise,
  defaultSkill,
  onClose,
  onCreated,
}: {
  lessonId: string
  exercise: TeacherExerciseSummary | null
  defaultSkill: SkillType
  onClose: () => void
  onCreated?: (created: TeacherExerciseDetail) => void
}) {
  const isEdit = !!exercise
  const hasSubmissions = (exercise?.submissionCount ?? 0) > 0
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()
  const mutation = isEdit ? updateExercise : createExercise

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: exercise?.title ?? '',
      skillType: exercise?.skillType ?? defaultSkill,
      exerciseType: exercise?.exerciseType ?? 'LESSON',
      timeLimitMinutes:
        exercise?.timeLimit && exercise.timeLimit > 0
          ? String(Math.ceil(exercise.timeLimit / 60))
          : '',
      maxAttempts: String(exercise?.maxAttempts ?? 3),
      passingScore: String(exercise?.passingScore ?? 0),
      ordering: exercise ? String(exercise.ordering) : '',
      audioUrl: exercise?.audioUrl ?? '',
      instruction: exercise?.instruction ?? '',
    },
  })

  const selectedSkill = watch('skillType')

  const onSubmit = (values: FormValues) => {
    const commonBody = {
      title: values.title,
      skillType: values.skillType,
      exerciseType: values.exerciseType,
      timeLimit:
        values.timeLimitMinutes.length > 0 ? Number(values.timeLimitMinutes) * 60 : undefined,
      maxAttempts: Number(values.maxAttempts),
      passingScore: Number(values.passingScore),
      ordering: values.ordering.length > 0 ? Number(values.ordering) : undefined,
      audioUrl: values.audioUrl?.trim() || undefined,
      instruction: values.instruction?.trim() || undefined,
    }

    if (exercise) {
      updateExercise.mutate({ id: exercise.id, body: commonBody }, { onSuccess: onClose })
    } else {
      createExercise.mutate(
        {
          lessonId,
          body: {
            ...commonBody,
            content: defaultContentForSkill(values.skillType),
          },
        },
        {
          onSuccess: (created) => {
            onClose()
            onCreated?.(created)
          },
        },
      )
    }
  }

  return (
    <DialogContent
      title={isEdit ? 'Cài đặt bài tập' : 'Thêm bài tập mới'}
      description={
        isEdit
          ? 'Cập nhật thông tin chung của bài tập. Sau khi tạo, mở trình soạn câu hỏi để nhập nội dung và đáp án.'
          : 'Chọn kỹ năng phù hợp và cấu hình giới hạn làm bài cho bài tập.'
      }
      className="max-w-xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Tên bài tập" htmlFor="ex-title" error={errors.title?.message}>
          <Input
            id="ex-title"
            placeholder="Ví dụ: Reading Passage 1 — Academic Skimming"
            aria-invalid={!!errors.title}
            {...register('title')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kỹ năng" htmlFor="ex-skill">
            <Select id="ex-skill" disabled={hasSubmissions} {...register('skillType')}>
              {SKILLS.map((sk) => (
                <option key={sk} value={sk}>
                  {SKILL_LABEL[sk]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Loại bài tập" htmlFor="ex-type">
            <Select id="ex-type" disabled={hasSubmissions} {...register('exerciseType')}>
              {EXERCISE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Thời gian (phút)"
            htmlFor="ex-time"
            error={errors.timeLimitMinutes?.message}
          >
            <Input
              id="ex-time"
              type="number"
              min={1}
              placeholder="20"
              aria-invalid={!!errors.timeLimitMinutes}
              {...register('timeLimitMinutes')}
            />
          </Field>
          <Field label="Số lần làm tối đa" htmlFor="ex-attempts" error={errors.maxAttempts?.message}>
            <Input
              id="ex-attempts"
              type="number"
              min={1}
              aria-invalid={!!errors.maxAttempts}
              {...register('maxAttempts')}
            />
          </Field>
          <Field label="Điểm đạt" htmlFor="ex-passing" error={errors.passingScore?.message}>
            <Input
              id="ex-passing"
              type="number"
              min={0}
              step="0.5"
              aria-invalid={!!errors.passingScore}
              {...register('passingScore')}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Thứ tự (để trống để xếp cuối)" htmlFor="ex-ordering" error={errors.ordering?.message}>
            <Input
              id="ex-ordering"
              type="number"
              min={0}
              placeholder="Tự động"
              aria-invalid={!!errors.ordering}
              {...register('ordering')}
            />
          </Field>

          {selectedSkill === 'LISTENING' && (
            <Field label="URL file nghe audio" htmlFor="ex-audio" error={errors.audioUrl?.message}>
              <Input
                id="ex-audio"
                placeholder="https://example.com/audio/part1.mp3"
                aria-invalid={!!errors.audioUrl}
                {...register('audioUrl')}
              />
            </Field>
          )}
        </div>

        <Field label="Hướng dẫn làm bài (tùy chọn)" htmlFor="ex-instruction">
          <Textarea
            id="ex-instruction"
            placeholder="Ví dụ: Dành khoảng 20 phút cho bài đọc và trả lời câu hỏi 1–13."
            {...register('instruction')}
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
            {isEdit ? 'Lưu cài đặt' : 'Tạo bài tập'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
