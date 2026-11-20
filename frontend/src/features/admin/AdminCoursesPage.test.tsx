import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { api } from '@/lib/api'
import type { AdminCourseSummary } from '@/lib/types'
import { AdminCoursesPage } from './AdminCoursesPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      categories: vi.fn(),
      adminCourses: vi.fn(),
      adminSetCourseFeatured: vi.fn(),
      adminDeactivateCourse: vi.fn(),
      adminActivateCourse: vi.fn(),
    },
  }
})

const activeApprovedCourse: AdminCourseSummary = {
  id: 'c-1',
  title: 'IELTS Reading Foundations',
  description: 'Academic reading strategies',
  teacherId: 't-1',
  teacherName: 'Nguyễn Minh Anh',
  categoryId: 'cat-academic',
  categoryName: 'Academic',
  skillFocus: 'READING',
  difficultyLevel: 'INTERMEDIATE',
  estimatedDuration: 600,
  isFeatured: false,
  isActive: true,
  status: 'APPROVED',
  publishedAt: '2026-10-01T08:00:00Z',
  totalLessons: 4,
  enrollmentCount: 12,
  createdAt: '2026-09-25T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
}

const inactiveCourse: AdminCourseSummary = {
  ...activeApprovedCourse,
  id: 'c-2',
  title: 'IELTS Listening Archived',
  skillFocus: 'LISTENING',
  isFeatured: false,
  isActive: false,
  deactivationReason: 'Đang cập nhật audio',
  enrollmentCount: 3,
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminCoursesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminCoursesPage', () => {
  beforeEach(() => {
    vi.mocked(api.categories).mockReset()
    vi.mocked(api.adminCourses).mockReset()
    vi.mocked(api.adminSetCourseFeatured).mockReset()
    vi.mocked(api.adminDeactivateCourse).mockReset()
    vi.mocked(api.adminActivateCourse).mockReset()

    vi.mocked(api.categories).mockResolvedValue([])
    vi.mocked(api.adminCourses).mockResolvedValue({
      items: [activeApprovedCourse, inactiveCourse],
      page: 1,
      size: 10,
      total: 2,
      totalPages: 1,
    })
  })

  it('toggles featured, deactivates with reason, and reactivates a hidden course', async () => {
    vi.mocked(api.adminSetCourseFeatured).mockResolvedValue({
      ...activeApprovedCourse,
      isFeatured: true,
    })
    vi.mocked(api.adminDeactivateCourse).mockResolvedValue({
      ...activeApprovedCourse,
      isActive: false,
      deactivationReason: 'Rà soát bản quyền',
    })
    vi.mocked(api.adminActivateCourse).mockResolvedValue({
      ...inactiveCourse,
      isActive: true,
      deactivationReason: null,
    })

    renderPage()

    expect(await screen.findByText('IELTS Reading Foundations')).toBeInTheDocument()
    expect(screen.getByText('12 học viên')).toBeInTheDocument()
    expect(screen.getByText('Đang cập nhật audio')).toBeInTheDocument()

    // Toggle featured on approved active course
    await userEvent.click(screen.getByRole('button', { name: 'Nổi bật' }))
    expect(api.adminSetCourseFeatured).toHaveBeenCalledWith('c-1', true)

    // Deactivate with required reason
    await userEvent.click(screen.getByRole('button', { name: 'Tạm ẩn' }))
    const deactivateDialog = screen.getByRole('dialog')
    await userEvent.type(
      within(deactivateDialog).getByLabelText('Lý do tạm ẩn'),
      'Rà soát bản quyền',
    )
    await userEvent.click(within(deactivateDialog).getByRole('button', { name: 'Tạm ẩn khóa học' }))
    expect(api.adminDeactivateCourse).toHaveBeenCalledWith('c-1', 'Rà soát bản quyền')

    // Reactivate hidden course
    await userEvent.click(screen.getByRole('button', { name: 'Mở lại' }))
    const activateDialog = screen.getByRole('dialog')
    await userEvent.click(within(activateDialog).getByRole('button', { name: 'Mở lại khóa học' }))
    expect(api.adminActivateCourse).toHaveBeenCalledWith('c-2')
  })
})
