import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  Unlock,
  Users,
} from 'lucide-react'
import { PageTitle } from '@/components/PageHeading'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { USER_STATUS_META } from '@/lib/moderation'
import {
  useAdminTeachers,
  useApproveTeacher,
  useLockTeacher,
  useResetTeacherPassword,
  useUnlockTeacher,
} from '@/lib/queries'
import type { TeacherAccount, UserStatus } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { CreateTeacherDialog } from './CreateTeacherDialog'
import { EditTeacherDialog } from './EditTeacherDialog'
import { ConfirmActionDialog, LockTeacherDialog } from './ModerationDialogs'

const STATUS_VALUES: UserStatus[] = ['PENDING', 'ACTIVE', 'LOCKED']

export function AdminTeachersPage() {
  const [params, setParams] = useSearchParams()
  const rawStatus = params.get('status') as UserStatus | null
  const status: UserStatus | '' =
    rawStatus && STATUS_VALUES.includes(rawStatus) ? rawStatus : ''
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1)

  const [searchInput, setSearchInput] = useState(q)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<TeacherAccount | null>(null)
  const [resetTarget, setResetTarget] = useState<TeacherAccount | null>(null)
  const [resetResult, setResetResult] = useState<TeacherAccount | null>(null)
  const [copiedReset, setCopiedReset] = useState(false)
  const [approveTarget, setApproveTarget] = useState<TeacherAccount | null>(null)
  const [lockTarget, setLockTarget] = useState<TeacherAccount | null>(null)
  const [unlockTarget, setUnlockTarget] = useState<TeacherAccount | null>(null)

  const teachers = useAdminTeachers({ status, q, page, size: 10 })
  const approveTeacher = useApproveTeacher()
  const lockTeacher = useLockTeacher()
  const unlockTeacher = useUnlockTeacher()
  const resetPassword = useResetTeacherPassword()

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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Quản lý giảng viên"
          subtitle="Tạo tài khoản mới, phê duyệt giảng viên đăng ký và khóa/mở khóa khi cần."
        />
        <Button onClick={() => setCreateOpen(true)} className="shrink-0 self-start">
          <Plus /> Tạo tài khoản giảng viên
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
            placeholder="Tìm theo tên, tên đăng nhập hoặc email..."
            aria-label="Tìm kiếm giảng viên"
            className="pl-10"
          />
        </div>
        <Select
          aria-label="Lọc trạng thái giảng viên"
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

      {teachers.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : teachers.error ? (
        <ErrorState message={errorMessage(teachers.error)} onRetry={() => teachers.refetch()} />
      ) : !teachers.data?.items.length ? (
        <EmptyState
          icon={Users}
          title="Không tìm thấy giảng viên nào"
          description="Thử xóa bộ lọc tìm kiếm hoặc tạo tài khoản giảng viên mới."
          className="bg-surface"
        />
      ) : (
        <>
          <div className="space-y-3">
            {teachers.data.items.map((teacher) => {
              const meta = USER_STATUS_META[teacher.status]
              return (
                <div
                  key={teacher.id}
                  className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <Avatar name={teacher.fullName} className="size-11" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{teacher.fullName}</h3>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        @{teacher.username} · {teacher.email}
                        {teacher.phone ? ` · ${teacher.phone}` : ''}
                      </p>
                      {teacher.bio && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">{teacher.bio}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Ngày tạo: {formatDate(teacher.createdAt)}
                        {typeof teacher.courseCount === 'number'
                          ? ` · ${teacher.courseCount} khóa học`
                          : ''}
                      </p>
                      {teacher.status === 'LOCKED' && teacher.lockReason && (
                        <p className="mt-1 rounded-lg bg-danger-soft px-3 py-1.5 text-xs text-danger">
                          <span className="font-semibold">Lý do khóa:</span> {teacher.lockReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditTarget(teacher)}
                    >
                      <Pencil /> Chỉnh sửa
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        resetPassword.reset()
                        setResetTarget(teacher)
                      }}
                    >
                      <KeyRound /> Đặt lại mật khẩu
                    </Button>
                    {teacher.status === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => {
                          approveTeacher.reset()
                          setApproveTarget(teacher)
                        }}
                      >
                        <Check /> Phê duyệt
                      </Button>
                    )}
                    {teacher.status !== 'LOCKED' && (
                      <Button
                        size="sm"
                        variant="dangerSoft"
                        onClick={() => {
                          lockTeacher.reset()
                          setLockTarget(teacher)
                        }}
                      >
                        <Lock /> Khóa
                      </Button>
                    )}
                    {teacher.status === 'LOCKED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          unlockTeacher.reset()
                          setUnlockTarget(teacher)
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
            page={teachers.data.page}
            totalPages={teachers.data.totalPages}
            totalItems={teachers.data.total}
            pageSize={teachers.data.size}
            itemLabel="giảng viên"
            onPageChange={(nextPage) => updateParams({ page: nextPage })}
          />
        </>
      )}

      <CreateTeacherDialog open={createOpen} onOpenChange={setCreateOpen} />

      <EditTeacherDialog
        teacher={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
      />

      <ConfirmActionDialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) setResetTarget(null)
        }}
        title="Đặt lại mật khẩu giảng viên"
        description={
          resetTarget
            ? `Hệ thống sẽ tạo mật khẩu tạm mới cho "${resetTarget.fullName}" (@${resetTarget.username}). Mật khẩu cũ sẽ mất hiệu lực ngay lập tức.`
            : ''
        }
        confirmLabel="Cấp mật khẩu mới"
        confirmVariant="primary"
        loading={resetPassword.isPending}
        error={resetPassword.error ? errorMessage(resetPassword.error) : null}
        onConfirm={() => {
          if (!resetTarget) return
          resetPassword.mutate(resetTarget.id, {
            onSuccess: (updated) => {
              setResetTarget(null)
              setCopiedReset(false)
              setResetResult(updated)
            },
          })
        }}
      />

      <Dialog
        open={!!resetResult}
        onOpenChange={(open) => {
          if (!open) setResetResult(null)
        }}
      >
        {resetResult?.temporaryPassword && (
          <DialogContent
            title="Đã đặt lại mật khẩu"
            description={`Mật khẩu mới cho tài khoản @${resetResult.username} đã được kích hoạt.`}
          >
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-3.5 py-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Mật khẩu tạm chỉ hiển thị <strong>một lần duy nhất</strong>. Hãy sao chép và gửi
                  cho giảng viên.
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/50 p-4 text-sm">
                <span className="text-muted-foreground">Mật khẩu tạm</span>
                <div className="flex items-center gap-2">
                  <code
                    data-testid="reset-temporary-password"
                    className="rounded-lg bg-surface px-2.5 py-1 font-mono text-sm font-bold text-primary"
                  >
                    {resetResult.temporaryPassword}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard
                        ?.writeText(resetResult.temporaryPassword ?? '')
                        .catch(() => {})
                      setCopiedReset(true)
                    }}
                  >
                    {copiedReset ? <Check className="text-success" /> : <Copy />}
                    {copiedReset ? 'Đã chép' : 'Sao chép'}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={() => setResetResult(null)}>
                  Hoàn tất
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <ConfirmActionDialog
        open={!!approveTarget}
        onOpenChange={(open) => {
          if (!open) setApproveTarget(null)
        }}
        title="Phê duyệt tài khoản giảng viên"
        description={
          approveTarget
            ? `Kích hoạt tài khoản "${approveTarget.fullName}" (@${approveTarget.username}) để giảng viên có thể đăng nhập?`
            : ''
        }
        confirmLabel="Phê duyệt"
        confirmVariant="success"
        loading={approveTeacher.isPending}
        error={approveTeacher.error ? errorMessage(approveTeacher.error) : null}
        onConfirm={() => {
          if (!approveTarget) return
          approveTeacher.mutate(approveTarget.id, {
            onSuccess: () => setApproveTarget(null),
          })
        }}
      />

      <LockTeacherDialog
        open={!!lockTarget}
        onOpenChange={(open) => {
          if (!open) setLockTarget(null)
        }}
        teacherName={lockTarget?.fullName ?? ''}
        loading={lockTeacher.isPending}
        error={lockTeacher.error ? errorMessage(lockTeacher.error) : null}
        onConfirm={(reason) => {
          if (!lockTarget) return
          lockTeacher.mutate(
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
        title="Mở khóa tài khoản giảng viên"
        description={
          unlockTarget
            ? `Mở khóa cho "${unlockTarget.fullName}" (@${unlockTarget.username}) hoạt động trở lại?`
            : ''
        }
        confirmLabel="Mở khóa"
        confirmVariant="primary"
        loading={unlockTeacher.isPending}
        error={unlockTeacher.error ? errorMessage(unlockTeacher.error) : null}
        onConfirm={() => {
          if (!unlockTarget) return
          unlockTeacher.mutate(unlockTarget.id, {
            onSuccess: () => setUnlockTarget(null),
          })
        }}
      />
    </div>
  )
}
