import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookOpen, Eye, EyeOff, RotateCcw, Search, Star, Users } from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { CONTENT_STATUS_META } from '@/lib/moderation'
import {
  useActivateCourse,
  useAdminCourses,
  useCategories,
  useDeactivateCourse,
  useSetCourseFeatured,
} from '@/lib/queries'
import type { AdminCourseSummary, ContentStatus, SkillType } from '@/lib/types'
import { formatDate, LEVEL_LABEL, SKILL_LABEL } from '@/lib/utils'
import { ConfirmActionDialog, ReasonActionDialog } from './ModerationDialogs'

const STATUS_VALUES: ContentStatus[] = ['APPROVED', 'PENDING_REVIEW', 'REJECTED', 'DRAFT']
const SKILL_VALUES: SkillType[] = ['READING', 'LISTENING', 'WRITING', 'SPEAKING']

export function AdminCoursesPage() {
  const [params, setParams] = useSearchParams()
  const rawStatus = params.get('status') as ContentStatus | null
  const status: ContentStatus | '' =
    rawStatus && STATUS_VALUES.includes(rawStatus) ? rawStatus : ''
  const rawActive = params.get('isActive') ?? ''
  const isActive: boolean | undefined =
    rawActive === 'true' ? true : rawActive === 'false' ? false : undefined
  const rawSkill = params.get('skill') as SkillType | null
  const skill: SkillType | '' = rawSkill && SKILL_VALUES.includes(rawSkill) ? rawSkill : ''
  const categoryId = params.get('categoryId') ?? ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const [searchInput, setSearchInput] = useState(q)
  const [deactivateTarget, setDeactivateTarget] = useState<AdminCourseSummary | null>(null)
  const [activateTarget, setActivateTarget] = useState<AdminCourseSummary | null>(null)

  const categories = useCategories()
  const courses = useAdminCourses({ status, isActive, skill, categoryId, q, page, size: 10 })
  const setFeatured = useSetCourseFeatured()
  const deactivateCourse = useDeactivateCourse()
  const activateCourse = useActivateCourse()

  const updateParams = (next: {
    status?: ContentStatus | ''
    isActive?: string
    skill?: SkillType | ''
    categoryId?: string
    q?: string
    page?: number
  }) => {
    const mergedStatus = next.status !== undefined ? next.status : status
    const mergedActive = next.isActive !== undefined ? next.isActive : rawActive
    const mergedSkill = next.skill !== undefined ? next.skill : skill
    const mergedCategory = next.categoryId !== undefined ? next.categoryId : categoryId
    const mergedQ = next.q !== undefined ? next.q : q
    const mergedPage = next.page ?? 1

    const nextParams = new URLSearchParams()
    if (mergedStatus) nextParams.set('status', mergedStatus)
    if (mergedActive === 'true' || mergedActive === 'false') nextParams.set('isActive', mergedActive)
    if (mergedSkill) nextParams.set('skill', mergedSkill)
    if (mergedCategory) nextParams.set('categoryId', mergedCategory)
    if (mergedQ.trim()) nextParams.set('q', mergedQ.trim())
    if (mergedPage > 1) nextParams.set('page', String(mergedPage))
    setParams(nextParams)
  }

  return (
    <div>
      <PageTitle
        title="Quản lý khóa học"
        subtitle="Theo dõi tất cả khóa học toàn hệ thống, gắn nổi bật và tạm ẩn/mở lại hiển thị khi cần."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          updateParams({ q: searchInput, page: 1 })
        }}
        className="card mb-6 grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-6"
      >
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên khóa học hoặc giảng viên..."
            aria-label="Tìm kiếm khóa học"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Lọc trạng thái duyệt"
          value={status}
          onChange={(e) => updateParams({ status: e.target.value as ContentStatus | '', page: 1 })}
        >
          <option value="">Mọi trạng thái duyệt</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {CONTENT_STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Lọc hiển thị"
          value={rawActive}
          onChange={(e) => updateParams({ isActive: e.target.value, page: 1 })}
        >
          <option value="">Tất cả hiển thị</option>
          <option value="true">Đang hiển thị</option>
          <option value="false">Đang ẩn</option>
        </Select>
        <Select
          aria-label="Lọc kỹ năng"
          value={skill}
          onChange={(e) => updateParams({ skill: e.target.value as SkillType | '', page: 1 })}
        >
          <option value="">Mọi kỹ năng</option>
          {SKILL_VALUES.map((sk) => (
            <option key={sk} value={sk}>
              {SKILL_LABEL[sk]}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Select
            aria-label="Lọc danh mục"
            value={categoryId}
            onChange={(e) => updateParams({ categoryId: e.target.value, page: 1 })}
            className="flex-1"
          >
            <option value="">Mọi danh mục</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline" className="shrink-0">
            Lọc
          </Button>
        </div>
      </form>

      {courses.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : courses.error ? (
        <ErrorState message={errorMessage(courses.error)} onRetry={() => courses.refetch()} />
      ) : !courses.data?.items.length ? (
        <EmptyState
          icon={BookOpen}
          title="Không tìm thấy khóa học nào"
          description="Thử thay đổi bộ lọc trạng thái, kỹ năng hoặc từ khóa tìm kiếm."
          className="bg-surface"
        />
      ) : (
        <>
          <div className="space-y-3">
            {courses.data.items.map((course) => {
              const statusMeta = CONTENT_STATUS_META[course.status]
              const canFeature = course.status === 'APPROVED' && course.isActive
              return (
                <div
                  key={course.id}
                  className="card flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                      {course.isFeatured && (
                        <Badge tone="warning">
                          <Star /> Nổi bật
                        </Badge>
                      )}
                      {!course.isActive && <Badge tone="danger">Đang ẩn</Badge>}
                      {course.skillFocus && (
                        <Badge tone="info">{SKILL_LABEL[course.skillFocus]}</Badge>
                      )}
                      {course.difficultyLevel && (
                        <Badge tone="neutral">{LEVEL_LABEL[course.difficultyLevel]}</Badge>
                      )}
                      {course.categoryName && <Badge tone="neutral">{course.categoryName}</Badge>}
                    </div>

                    <div>
                      <h3 className="text-base font-semibold">{course.title}</h3>
                      {course.description && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                          {course.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Giảng viên:{' '}
                        <strong className="text-foreground">{course.teacherName}</strong>
                      </span>
                      <span>{course.totalLessons} bài học</span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3.5" />{' '}
                        {course.maxStudents
                          ? `${course.enrollmentCount}/${course.maxStudents} học viên`
                          : `${course.enrollmentCount} học viên`}
                      </span>
                      {(course.startDate || course.endDate) && (
                        <span>
                          Lịch: {formatDate(course.startDate)} → {formatDate(course.endDate)}
                        </span>
                      )}
                      <span>Tạo: {formatDate(course.createdAt)}</span>
                    </div>

                    {!course.isActive && course.deactivationReason && (
                      <p className="rounded-xl bg-danger-soft px-3 py-2 text-xs text-danger">
                        <span className="font-semibold">Lý do tạm ẩn:</span>{' '}
                        {course.deactivationReason}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/admin/courses/${course.id}`}>
                        <Eye /> Xem chi tiết
                      </Link>
                    </Button>
                    {canFeature && (
                      <Button
                        size="sm"
                        variant={course.isFeatured ? 'soft' : 'outline'}
                        disabled={setFeatured.isPending}
                        onClick={() =>
                          setFeatured.mutate({ id: course.id, featured: !course.isFeatured })
                        }
                      >
                        <Star /> {course.isFeatured ? 'Bỏ nổi bật' : 'Nổi bật'}
                      </Button>
                    )}
                    {course.isActive ? (
                      <Button
                        size="sm"
                        variant="dangerSoft"
                        onClick={() => {
                          deactivateCourse.reset()
                          setDeactivateTarget(course)
                        }}
                      >
                        <EyeOff /> Tạm ẩn
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          activateCourse.reset()
                          setActivateTarget(course)
                        }}
                      >
                        <RotateCcw /> Mở lại
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination
            page={courses.data.page}
            totalPages={courses.data.totalPages}
            totalItems={courses.data.total}
            pageSize={courses.data.size}
            itemLabel="khóa học"
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </>
      )}

      <ReasonActionDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null)
        }}
        itemKey={deactivateTarget?.id ?? ''}
        title="Tạm ẩn khóa học"
        description={
          deactivateTarget
            ? `Khóa học "${deactivateTarget.title}" sẽ ngừng hiển thị với học viên nhưng toàn bộ lịch sử học tập và ghi danh vẫn được giữ nguyên.`
            : ''
        }
        fieldLabel="Lý do tạm ẩn"
        placeholder="Ví dụ: Cần rà soát lại bản quyền tài liệu hoặc cập nhật chương trình..."
        submitLabel="Tạm ẩn khóa học"
        loading={deactivateCourse.isPending}
        error={deactivateCourse.error ? errorMessage(deactivateCourse.error) : null}
        onConfirm={(reason) => {
          if (!deactivateTarget) return
          deactivateCourse.mutate(
            { id: deactivateTarget.id, reason },
            { onSuccess: () => setDeactivateTarget(null) },
          )
        }}
      />

      <ConfirmActionDialog
        open={!!activateTarget}
        onOpenChange={(open) => {
          if (!open) setActivateTarget(null)
        }}
        title="Mở lại hiển thị khóa học"
        description={
          activateTarget
            ? `Kích hoạt lại khóa học "${activateTarget.title}"? (Nếu khóa học đã được duyệt, học viên sẽ truy cập được ngay.)`
            : ''
        }
        confirmLabel="Mở lại khóa học"
        confirmVariant="success"
        loading={activateCourse.isPending}
        error={activateCourse.error ? errorMessage(activateCourse.error) : null}
        onConfirm={() => {
          if (!activateTarget) return
          activateCourse.mutate(activateTarget.id, {
            onSuccess: () => setActivateTarget(null),
          })
        }}
      />
    </div>
  )
}
