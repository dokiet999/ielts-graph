import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, GraduationCap, Lock, Search, Unlock } from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { USER_STATUS_META } from '@/lib/moderation'
import { useAdminStudents, useLockStudent, useUnlockStudent } from '@/lib/queries'
import type { StudentAccount, UserStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { ConfirmActionDialog, ReasonActionDialog } from './ModerationDialogs'

const STATUS_VALUES: UserStatus[] = ['ACTIVE', 'LOCKED', 'PENDING']

export function AdminStudentsPage() {
  const [params, setParams] = useSearchParams()
  const rawStatus = params.get('status') as UserStatus | null
  const status: UserStatus | '' =
    rawStatus && STATUS_VALUES.includes(rawStatus) ? rawStatus : ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const [searchInput, setSearchInput] = useState(q)
  const [lockTarget, setLockTarget] = useState<StudentAccount | null>(null)
  const [unlockTarget, setUnlockTarget] = useState<StudentAccount | null>(null)

  const students = useAdminStudents({ status, q, page, size: 10 })
  const lockStudent = useLockStudent()
  const unlockStudent = useUnlockStudent()

  const updateParams = (next: { status?: UserStatus | ''; q?: string; page?: number }) => {
    const mergedStatus = next.status !== undefined ? next.status : status
    const mergedQ = next.q !== undefined ? next.q : q
    const mergedPage = next.page ?? 1
    const nextParams = new URLSearchParams()
    if (mergedStatus) nextParams.set('status', mergedStatus)
    if (mergedQ.trim()) nextParams.set('q', mergedQ.trim())
    if (mergedPage > 1) nextParams.set('page', String(mergedPage))
    setParams(nextParams)
  }

  return (
    <div>
      <PageTitle
        title="Quản lý học viên"
        subtitle="Theo dõi tài khoản học viên và khóa/mở khóa khi vi phạm quy định hệ thống."
      />

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
            placeholder="Tìm theo tên, tên đăng nhập hoặc email..."
            aria-label="Tìm kiếm học viên"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Lọc trạng thái học viên"
          value={status}
          onChange={(e) => updateParams({ status: e.target.value as UserStatus | '', page: 1 })}
          className="sm:w-52"
        >
          <option value="">Tất cả trạng thái</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {USER_STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Tìm kiếm
        </Button>
      </form>

      {students.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : students.error ? (
        <ErrorState message={errorMessage(students.error)} onRetry={() => students.refetch()} />
      ) : !students.data?.items.length ? (
        <EmptyState
          icon={GraduationCap}
          title="Không tìm thấy học viên nào"
          description="Thử xóa bộ lọc hoặc từ khóa tìm kiếm để xem tất cả học viên."
          className="bg-surface"
        />
      ) : (
        <>
          <div className="space-y-3">
            {students.data.items.map((student) => {
              const meta = USER_STATUS_META[student.status]
              return (
                <div
                  key={student.id}
                  className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <Avatar name={student.fullName} className="size-11" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{student.fullName}</h3>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <Badge tone="info">
                          <BookOpen /> {student.enrollmentCount} khóa học
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        @{student.username} · {student.email}
                        {student.phone ? ` · ${student.phone}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ngày tham gia: {formatDate(student.createdAt)}
                      </p>
                      {student.status === 'LOCKED' && student.lockReason && (
                        <p className="mt-1 rounded-lg bg-danger-soft px-3 py-1.5 text-xs text-danger">
                          <span className="font-semibold">Lý do khóa:</span> {student.lockReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {student.status !== 'LOCKED' && (
                      <Button
                        size="sm"
                        variant="dangerSoft"
                        onClick={() => {
                          lockStudent.reset()
                          setLockTarget(student)
                        }}
                      >
                        <Lock /> Khóa
                      </Button>
                    )}
                    {student.status === 'LOCKED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          unlockStudent.reset()
                          setUnlockTarget(student)
                        }}
                      >
                        <Unlock /> Mở khóa
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination
            page={students.data.page}
            totalPages={students.data.totalPages}
            totalItems={students.data.total}
            pageSize={students.data.size}
            itemLabel="học viên"
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </>
      )}

      <ReasonActionDialog
        open={!!lockTarget}
        onOpenChange={(open) => {
          if (!open) setLockTarget(null)
        }}
        itemKey={lockTarget?.id ?? ''}
        title="Khóa tài khoản học viên"
        description={
          lockTarget
            ? `Tài khoản "${lockTarget.fullName}" (@${lockTarget.username}) sẽ bị tạm ngưng đăng nhập nhưng toàn bộ dữ liệu học tập vẫn được giữ nguyên.`
            : ''
        }
        fieldLabel="Lý do khóa tài khoản"
        placeholder="Ví dụ: Chia sẻ tài khoản hoặc vi phạm nội quy..."
        submitLabel="Khóa tài khoản"
        loading={lockStudent.isPending}
        error={lockStudent.error ? errorMessage(lockStudent.error) : null}
        onConfirm={(reason) => {
          if (!lockTarget) return
          lockStudent.mutate(
            { id: lockTarget.id, reason },
            { onSuccess: () => setLockTarget(null) },
          )
        }}
      />

      <ConfirmActionDialog
        open={!!unlockTarget}
        onOpenChange={(open) => {
          if (!open) setUnlockTarget(null)
        }}
        title="Mở khóa tài khoản học viên"
        description={
          unlockTarget
            ? `Khôi phục quyền đăng nhập cho "${unlockTarget.fullName}" (@${unlockTarget.username})?`
            : ''
        }
        confirmLabel="Mở khóa"
        confirmVariant="primary"
        loading={unlockStudent.isPending}
        error={unlockStudent.error ? errorMessage(unlockStudent.error) : null}
        onConfirm={() => {
          if (!unlockTarget) return
          unlockStudent.mutate(unlockTarget.id, {
            onSuccess: () => setUnlockTarget(null),
          })
        }}
      />
    </div>
  )
}
