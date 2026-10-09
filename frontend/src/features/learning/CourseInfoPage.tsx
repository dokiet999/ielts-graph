import { CoursePageHeader } from '@/layouts/CourseLayout'
import { useCourseContext } from '@/layouts/courseContext'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, LEVEL_LABEL } from '@/lib/utils'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[200px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function CourseInfoPage() {
  const { course } = useCourseContext()
  return (
    <div>
      <CoursePageHeader title="Course info" />
      <dl className="card divide-y px-6">
        <Row label="Tên khóa học">{course.title}</Row>
        <Row label="Mô tả">{course.description ?? '—'}</Row>
        <Row label="Danh mục">{course.categoryName ?? '—'}</Row>
        <Row label="Trình độ">{LEVEL_LABEL[course.level]}</Row>
        <Row label="Thời lượng">
          {course.estimatedDuration ? `${course.estimatedDuration} buổi học` : '—'}
        </Row>
        <Row label="Ngày bắt đầu">{formatDate(course.enrolledAt)}</Row>
        <Row label="Giáo viên">
          <span className="flex items-center gap-2">
            <Avatar
              name={course.teacher.fullName}
              src={course.teacher.avatarUrl}
              className="size-8"
            />
            {course.teacher.fullName}
          </span>
        </Row>
        <Row label="Các giai đoạn">
          <ol className="space-y-1">
            {course.sections.map((s) => (
              <li key={s.id}>
                Giai đoạn {s.ordering}: {s.title}
              </li>
            ))}
          </ol>
        </Row>
      </dl>
    </div>
  )
}
