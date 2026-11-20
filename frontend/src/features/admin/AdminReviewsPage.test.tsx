import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { api } from '@/lib/api'
import type { AdminCourseDetail, ReviewQueueItem } from '@/lib/types'
import { AdminCoursePreviewPage } from './AdminCoursePreviewPage'
import { AdminReviewsPage } from './AdminReviewsPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      adminCourseReviews: vi.fn(),
      adminLessonReviews: vi.fn(),
      adminCourseDetail: vi.fn(),
      adminApproveCourse: vi.fn(),
      adminRejectCourse: vi.fn(),
      adminApproveLesson: vi.fn(),
      adminRejectLesson: vi.fn(),
    },
  }
})

const pendingCourseItem: ReviewQueueItem = {
  id: 'c-pending',
  title: 'Speaking Part 2 Fluency',
  teacherName: 'Nguyễn Minh Anh',
  skillFocus: 'SPEAKING',
  status: 'PENDING_REVIEW',
  submittedAt: '2026-11-10T08:00:00Z',
  waitingDays: 3,
  pendingLessonCount: 2,
}

const pendingLessonItem: ReviewQueueItem = {
  id: 'l-pending',
  title: 'Heading Matching Nâng Cao',
  teacherName: 'Nguyễn Minh Anh',
  skillFocus: 'READING',
  status: 'PENDING_REVIEW',
  submittedAt: '2026-11-12T08:00:00Z',
  waitingDays: 1,
  courseId: 'c-approved',
  courseTitle: 'IELTS Reading Foundations',
  sectionId: 's-1',
  sectionTitle: 'Getting started',
  lessonType: 'VIDEO',
}

const courseDetail: AdminCourseDetail = {
  id: 'c-approved',
  title: 'IELTS Reading Foundations',
  description: 'Khóa nền tảng Reading',
  teacherId: 't-1',
  teacherName: 'Nguyễn Minh Anh',
  categoryName: 'Academic',
  skillFocus: 'READING',
  difficultyLevel: 'INTERMEDIATE',
  estimatedDuration: 420,
  isFeatured: true,
  isActive: true,
  publishedAt: '2026-10-01T08:00:00Z',
  status: 'APPROVED',
  createdAt: '2026-09-20T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
  totalLessons: 2,
  sections: [
    {
      id: 's-1',
      title: 'Getting started',
      ordering: 1,
      lessons: [
        {
          id: 'l-approved',
          sectionId: 's-1',
          title: 'Intro Reading',
          lessonType: 'VIDEO',
          ordering: 1,
          isPreview: true,
          status: 'APPROVED',
        },
        {
          id: 'l-pending',
          sectionId: 's-1',
          title: 'Heading Matching Nâng Cao',
          lessonType: 'VIDEO',
          ordering: 2,
          isPreview: false,
          status: 'PENDING_REVIEW',
        },
      ],
    },
  ],
}

describe('AdminReviewsPage & AdminCoursePreviewPage', () => {
  beforeEach(() => {
    vi.mocked(api.adminCourseReviews).mockReset()
    vi.mocked(api.adminLessonReviews).mockReset()
    vi.mocked(api.adminCourseDetail).mockReset()
    vi.mocked(api.adminApproveCourse).mockReset()
    vi.mocked(api.adminRejectCourse).mockReset()
    vi.mocked(api.adminApproveLesson).mockReset()
    vi.mocked(api.adminRejectLesson).mockReset()

    vi.mocked(api.adminCourseReviews).mockResolvedValue({
      items: [pendingCourseItem],
      page: 1,
      size: 10,
      total: 1,
      totalPages: 1,
    })
    vi.mocked(api.adminLessonReviews).mockResolvedValue({
      items: [pendingLessonItem],
      page: 1,
      size: 10,
      total: 1,
      totalPages: 1,
    })
    vi.mocked(api.adminCourseDetail).mockResolvedValue(courseDetail)
    vi.mocked(api.adminRejectCourse).mockResolvedValue(courseDetail)
    vi.mocked(api.adminApproveLesson).mockResolvedValue({
      ...pendingLessonItem,
      status: 'APPROVED',
    })
  })

  it('switches between courses and lessons queues and validates required rejection reason', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/admin/reviews']}>
          <Routes>
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Speaking Part 2 Fluency')).toBeInTheDocument()
    expect(screen.getByText('Chờ 3 ngày')).toBeInTheDocument()

    // Reject course: blank reason shows inline error, non-blank calls API
    await userEvent.click(screen.getByRole('button', { name: 'Từ chối' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Từ chối' }))
    expect(within(dialog).getByText('Vui lòng nhập lý do.')).toBeInTheDocument()
    expect(api.adminRejectCourse).not.toHaveBeenCalled()

    await userEvent.type(within(dialog).getByLabelText('Lý do từ chối'), 'Thiếu tài liệu PDF')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Từ chối' }))
    expect(api.adminRejectCourse).toHaveBeenCalledWith('c-pending', 'Thiếu tài liệu PDF')

    // Switch to lessons tab
    await userEvent.click(screen.getByRole('tab', { name: 'Bài học lẻ' }))
    expect(await screen.findByText('Heading Matching Nâng Cao')).toBeInTheDocument()
    expect(screen.getByText(/IELTS Reading Foundations/)).toBeInTheDocument()
  })

  it('shows all lessons in AdminCoursePreviewPage and approves pending lesson in an approved course', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/admin/courses/c-approved']}>
          <Routes>
            <Route path="/admin/courses/:courseId" element={<AdminCoursePreviewPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('1. Intro Reading')).toBeInTheDocument()
    expect(screen.getByText('2. Heading Matching Nâng Cao')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Duyệt bài' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(
      within(dialog).getByLabelText('Ghi chú cho giảng viên (không bắt buộc)'),
      'Đạt chuẩn',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận duyệt' }))

    expect(api.adminApproveLesson).toHaveBeenCalledWith('l-pending', 'Đạt chuẩn')
  })
})
