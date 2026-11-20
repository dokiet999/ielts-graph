import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { api } from '@/lib/api'
import type { TeacherAccount } from '@/lib/types'
import { AdminTeachersPage } from './AdminTeachersPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      adminTeachers: vi.fn(),
      adminCreateTeacher: vi.fn(),
      adminUpdateTeacher: vi.fn(),
      adminResetTeacherPassword: vi.fn(),
      adminApproveTeacher: vi.fn(),
      adminLockTeacher: vi.fn(),
      adminUnlockTeacher: vi.fn(),
    },
  }
})

const pendingTeacher: TeacherAccount = {
  id: 't-pending',
  username: 'teacher_pending',
  email: 'pending@ielts.dev',
  fullName: 'Lê Thu Hà',
  phone: '0901112223',
  bio: 'Listening specialist',
  role: 'TEACHER',
  status: 'PENDING',
  isActive: false,
  emailVerified: true,
  lockReason: null,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
}

const activeTeacher: TeacherAccount = {
  id: 't-active',
  username: 'teacher_demo',
  email: 'demo@ielts.dev',
  fullName: 'Nguyễn Minh Anh',
  role: 'TEACHER',
  status: 'ACTIVE',
  isActive: true,
  emailVerified: true,
  lockReason: null,
  createdAt: '2026-09-20T08:00:00Z',
  updatedAt: '2026-09-20T08:00:00Z',
}

const lockedTeacher: TeacherAccount = {
  id: 't-locked',
  username: 'teacher_locked',
  email: 'locked@ielts.dev',
  fullName: 'Trần Bảo Nam',
  role: 'TEACHER',
  status: 'LOCKED',
  isActive: false,
  emailVerified: true,
  lockReason: 'Tạm khóa theo yêu cầu',
  createdAt: '2026-09-10T08:00:00Z',
  updatedAt: '2026-09-12T08:00:00Z',
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminTeachersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminTeachersPage', () => {
  beforeEach(() => {
    vi.mocked(api.adminTeachers).mockReset()
    vi.mocked(api.adminCreateTeacher).mockReset()
    vi.mocked(api.adminUpdateTeacher).mockReset()
    vi.mocked(api.adminResetTeacherPassword).mockReset()
    vi.mocked(api.adminApproveTeacher).mockReset()
    vi.mocked(api.adminLockTeacher).mockReset()
    vi.mocked(api.adminUnlockTeacher).mockReset()

    vi.mocked(api.adminTeachers).mockResolvedValue({
      items: [pendingTeacher, activeTeacher, lockedTeacher],
      page: 1,
      size: 10,
      total: 3,
      totalPages: 1,
    })
  })

  it('lists teachers and creates a new teacher displaying one-time temporaryPassword', async () => {
    vi.mocked(api.adminCreateTeacher).mockResolvedValue({
      ...activeTeacher,
      id: 't-new',
      username: 'new.teacher',
      email: 'new.teacher@ielts.dev',
      fullName: 'Phạm Hoàng',
      temporaryPassword: 'TempPass9988',
    })

    renderPage()

    expect(await screen.findByText('Lê Thu Hà')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Minh Anh')).toBeInTheDocument()
    expect(screen.getByText('Tạm khóa theo yêu cầu')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Tạo tài khoản giảng viên/ }))

    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Tên đăng nhập'), 'New.Teacher')
    await userEvent.type(within(dialog).getByLabelText('Email'), 'new.teacher@ielts.dev')
    await userEvent.type(within(dialog).getByLabelText('Họ và tên'), 'Phạm Hoàng')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }))

    expect(api.adminCreateTeacher).toHaveBeenCalledWith({
      username: 'new.teacher',
      email: 'new.teacher@ielts.dev',
      fullName: 'Phạm Hoàng',
      phone: undefined,
      bio: undefined,
      password: undefined,
    })

    expect(await screen.findByTestId('temporary-password')).toHaveTextContent('TempPass9988')
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tất' }))
  })

  it('approves a pending teacher, locks an active teacher with reason, and unlocks a locked teacher', async () => {
    vi.mocked(api.adminApproveTeacher).mockResolvedValue({ ...pendingTeacher, status: 'ACTIVE' })
    vi.mocked(api.adminLockTeacher).mockResolvedValue({
      ...activeTeacher,
      status: 'LOCKED',
      lockReason: 'Vi phạm quy định',
    })
    vi.mocked(api.adminUnlockTeacher).mockResolvedValue({
      ...lockedTeacher,
      status: 'ACTIVE',
      lockReason: null,
    })

    renderPage()
    await screen.findByText('Lê Thu Hà')

    // Approve pending teacher
    await userEvent.click(screen.getByRole('button', { name: 'Phê duyệt' }))
    const approveDialog = screen.getByRole('dialog')
    await userEvent.click(within(approveDialog).getByRole('button', { name: 'Phê duyệt' }))
    expect(api.adminApproveTeacher).toHaveBeenCalledWith('t-pending')

    // Lock active teacher (first Khóa button belongs to pending, second to active)
    const lockButtons = screen.getAllByRole('button', { name: 'Khóa' })
    await userEvent.click(lockButtons[1])
    const lockDialog = screen.getByRole('dialog')
    await userEvent.type(within(lockDialog).getByLabelText('Lý do khóa tài khoản'), 'Vi phạm quy định')
    await userEvent.click(within(lockDialog).getByRole('button', { name: 'Khóa tài khoản' }))
    expect(api.adminLockTeacher).toHaveBeenCalledWith('t-active', 'Vi phạm quy định')

    // Unlock locked teacher
    await userEvent.click(screen.getByRole('button', { name: 'Mở khóa' }))
    const unlockDialog = screen.getByRole('dialog')
    await userEvent.click(within(unlockDialog).getByRole('button', { name: 'Mở khóa' }))
    expect(api.adminUnlockTeacher).toHaveBeenCalledWith('t-locked')
  })

  it('edits a teacher profile and resets password showing temporary password', async () => {
    vi.mocked(api.adminUpdateTeacher).mockResolvedValue({
      ...activeTeacher,
      fullName: 'Nguyễn Minh Anh (Updated)',
      email: 'anh.updated@ielts.dev',
      phone: '0988777666',
      bio: 'Senior examiner',
    })
    vi.mocked(api.adminResetTeacherPassword).mockResolvedValue({
      ...activeTeacher,
      temporaryPassword: 'ResetTemp9988',
    })

    renderPage()
    await screen.findByText('Nguyễn Minh Anh')

    // Edit second teacher (activeTeacher)
    const editButtons = screen.getAllByRole('button', { name: 'Chỉnh sửa' })
    await userEvent.click(editButtons[1])
    const editDialog = screen.getByRole('dialog')
    const nameInput = within(editDialog).getByLabelText('Họ và tên')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Nguyễn Minh Anh (Updated)')
    const emailInput = within(editDialog).getByLabelText('Email')
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'anh.updated@ielts.dev')
    await userEvent.type(within(editDialog).getByLabelText('Số điện thoại'), '0988777666')
    await userEvent.click(within(editDialog).getByRole('button', { name: 'Lưu thay đổi' }))

    expect(api.adminUpdateTeacher).toHaveBeenCalledWith('t-active', {
      fullName: 'Nguyễn Minh Anh (Updated)',
      email: 'anh.updated@ielts.dev',
      phone: '0988777666',
      bio: undefined,
    })

    // Reset password for second teacher
    const resetButtons = screen.getAllByRole('button', { name: 'Đặt lại mật khẩu' })
    await userEvent.click(resetButtons[1])
    const confirmDialog = screen.getByRole('dialog')
    await userEvent.click(within(confirmDialog).getByRole('button', { name: 'Cấp mật khẩu mới' }))

    expect(api.adminResetTeacherPassword).toHaveBeenCalledWith('t-active')
    expect(await screen.findByTestId('reset-temporary-password')).toHaveTextContent('ResetTemp9988')
    await userEvent.click(screen.getByRole('button', { name: 'Hoàn tất' }))
  })
})
