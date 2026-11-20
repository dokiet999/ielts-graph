import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { api } from '@/lib/api'
import type { StudentAccount } from '@/lib/types'
import { AdminStudentsPage } from './AdminStudentsPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      adminStudents: vi.fn(),
      adminLockStudent: vi.fn(),
      adminUnlockStudent: vi.fn(),
    },
  }
})

const activeStudent: StudentAccount = {
  id: 's-active',
  username: 'student_enrolled',
  email: 'enrolled@ielts.dev',
  fullName: 'Trần Minh Khôi',
  phone: '0911223344',
  role: 'STUDENT',
  status: 'ACTIVE',
  isActive: true,
  emailVerified: true,
  lockReason: null,
  enrollmentCount: 2,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
}

const lockedStudent: StudentAccount = {
  id: 's-locked',
  username: 'student_locked',
  email: 'locked@ielts.dev',
  fullName: 'Phạm Quốc Bảo',
  role: 'STUDENT',
  status: 'LOCKED',
  isActive: false,
  emailVerified: true,
  lockReason: 'Vi phạm nội quy',
  enrollmentCount: 0,
  createdAt: '2026-09-20T08:00:00Z',
  updatedAt: '2026-09-21T08:00:00Z',
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminStudentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminStudentsPage', () => {
  beforeEach(() => {
    vi.mocked(api.adminStudents).mockReset()
    vi.mocked(api.adminLockStudent).mockReset()
    vi.mocked(api.adminUnlockStudent).mockReset()

    vi.mocked(api.adminStudents).mockResolvedValue({
      items: [activeStudent, lockedStudent],
      page: 1,
      size: 10,
      total: 2,
      totalPages: 1,
    })
  })

  it('lists students with enrollment counts, locks with required reason, and unlocks', async () => {
    vi.mocked(api.adminLockStudent).mockResolvedValue({
      ...activeStudent,
      status: 'LOCKED',
      isActive: false,
      lockReason: 'Chia sẻ tài khoản',
    })
    vi.mocked(api.adminUnlockStudent).mockResolvedValue({
      ...lockedStudent,
      status: 'ACTIVE',
      isActive: true,
      lockReason: null,
    })

    renderPage()

    expect(await screen.findByText('Trần Minh Khôi')).toBeInTheDocument()
    expect(screen.getByText('2 khóa học')).toBeInTheDocument()
    expect(screen.getByText('Vi phạm nội quy')).toBeInTheDocument()

    // Lock active student (requires non-empty reason)
    await userEvent.click(screen.getByRole('button', { name: 'Khóa' }))
    const lockDialog = screen.getByRole('dialog')
    await userEvent.click(within(lockDialog).getByRole('button', { name: 'Khóa tài khoản' }))
    expect(await within(lockDialog).findByText('Vui lòng nhập lý do.')).toBeInTheDocument()
    expect(api.adminLockStudent).not.toHaveBeenCalled()

    await userEvent.type(within(lockDialog).getByLabelText('Lý do khóa tài khoản'), 'Chia sẻ tài khoản')
    await userEvent.click(within(lockDialog).getByRole('button', { name: 'Khóa tài khoản' }))
    expect(api.adminLockStudent).toHaveBeenCalledWith('s-active', 'Chia sẻ tài khoản')

    // Unlock locked student
    await userEvent.click(screen.getByRole('button', { name: 'Mở khóa' }))
    const unlockDialog = screen.getByRole('dialog')
    await userEvent.click(within(unlockDialog).getByRole('button', { name: 'Mở khóa' }))
    expect(api.adminUnlockStudent).toHaveBeenCalledWith('s-locked')
  })
})
