import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { api } from '@/lib/api'
import type { AdminCourseDetail, TeacherCourseSummary } from '@/lib/types'
import { TeacherCourseDetailPage } from './TeacherCourseDetailPage'
import { TeacherCoursesPage } from './TeacherCoursesPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      categories: vi.fn(),
      teacherCourses: vi.fn(),
      teacherCourseDetail: vi.fn(),
      teacherCreateCourse: vi.fn(),
      teacherUpdateCourse: vi.fn(),
      teacherDeleteCourse: vi.fn(),
      teacherSubmitCourse: vi.fn(),
      teacherWithdrawCourse: vi.fn(),
      teacherArchiveCourse: vi.fn(),
      teacherCreateSection: vi.fn(),
      teacherUpdateSection: vi.fn(),
      teacherDeleteSection: vi.fn(),
      teacherCreateLesson: vi.fn(),
      teacherUpdateLesson: vi.fn(),
      teacherDeleteLesson: vi.fn(),
      teacherSubmitLesson: vi.fn(),
      teacherWithdrawLesson: vi.fn(),
    },
  }
})

const draftCourse: TeacherCourseSummary = {
  id: 'c-draft',
  title: 'IELTS Writing Task 1 Charts',
  description: 'Phân tích biểu đồ',
  skillFocus: 'WRITING',
  difficultyLevel: 'INTERMEDIATE',
  categoryName: 'Academic',
  status: 'DRAFT',
  isActive: true,
  totalLessons: 3,
  pendingLessonCount: 0,
  createdAt: '2026-11-01T08:00:00Z',
  updatedAt: '2026-11-01T08:00:00Z',
}

const rejectedCourse: TeacherCourseSummary = {
  id: 'c-rejected',
  title: 'IELTS Listening Section 3',
  description: 'Luyện nghe Section 3',
  skillFocus: 'LISTENING',
  difficultyLevel: 'ADVANCED',
  categoryName: 'Academic',
  status: 'REJECTED',
  reviewNote: 'Cần bổ sung transcript đầy đủ',
  isActive: true,
  totalLessons: 2,
  pendingLessonCount: 0,
  createdAt: '2026-10-20T08:00:00Z',
  updatedAt: '2026-11-05T08:00:00Z',
}

const approvedCourseDetail: AdminCourseDetail = {
  id: 'c-approved',
  title: 'IELTS Reading Foundations',
  description: 'Đọc hiểu học thuật',
  teacherId: 't-1',
  teacherName: 'Nguyễn Minh Anh',
  categoryName: 'Academic',
  skillFocus: 'READING',
  difficultyLevel: 'INTERMEDIATE',
  estimatedDuration: 600,
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
          id: 'l-1',
          sectionId: 's-1',
          title: 'Intro Reading',
          lessonType: 'VIDEO',
          ordering: 1,
          isPreview: true,
          status: 'APPROVED',
        },
        {
          id: 'l-draft',
          sectionId: 's-1',
          title: 'Summary Completion Tips',
          lessonType: 'DOCUMENT',
          ordering: 2,
          isPreview: false,
          status: 'DRAFT',
        },
      ],
    },
  ],
}

describe('TeacherCoursesPage & TeacherCourseDetailPage', () => {
  beforeEach(() => {
    vi.mocked(api.categories).mockReset()
    vi.mocked(api.teacherCourses).mockReset()
    vi.mocked(api.teacherCourseDetail).mockReset()
    vi.mocked(api.teacherCreateCourse).mockReset()
    vi.mocked(api.teacherUpdateCourse).mockReset()
    vi.mocked(api.teacherDeleteCourse).mockReset()
    vi.mocked(api.teacherSubmitCourse).mockReset()
    vi.mocked(api.teacherWithdrawCourse).mockReset()
    vi.mocked(api.teacherArchiveCourse).mockReset()
    vi.mocked(api.teacherCreateSection).mockReset()
    vi.mocked(api.teacherUpdateSection).mockReset()
    vi.mocked(api.teacherDeleteSection).mockReset()
    vi.mocked(api.teacherCreateLesson).mockReset()
    vi.mocked(api.teacherUpdateLesson).mockReset()
    vi.mocked(api.teacherDeleteLesson).mockReset()
    vi.mocked(api.teacherSubmitLesson).mockReset()
    vi.mocked(api.teacherWithdrawLesson).mockReset()

    vi.mocked(api.categories).mockResolvedValue([
      {
        id: 'cat-academic',
        name: 'Academic',
        slug: 'academic',
        description: null,
        iconUrl: null,
        isActive: true,
        ordering: 1,
        courseCount: 1,
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-10-01T08:00:00Z',
      },
    ])
    vi.mocked(api.teacherCourses).mockResolvedValue({
      items: [draftCourse, rejectedCourse],
      page: 1,
      size: 10,
      total: 2,
      totalPages: 1,
    })
    vi.mocked(api.teacherCourseDetail).mockResolvedValue(approvedCourseDetail)
    vi.mocked(api.teacherSubmitCourse).mockResolvedValue(approvedCourseDetail)
    vi.mocked(api.teacherSubmitLesson).mockResolvedValue({
      id: 'l-draft',
      title: 'Summary Completion Tips',
      teacherName: 'Nguyễn Minh Anh',
      status: 'PENDING_REVIEW',
      submittedAt: '2026-11-19T10:00:00Z',
      waitingDays: 0,
    })
  })

  it('displays course statuses and rejection notes, and submits a draft course', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/teacher/courses']}>
          <Routes>
            <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('IELTS Writing Task 1 Charts')).toBeInTheDocument()
    expect(screen.getByText('IELTS Listening Section 3')).toBeInTheDocument()
    expect(screen.getByText('Cần bổ sung transcript đầy đủ')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Gửi duyệt' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi duyệt' }))

    expect(api.teacherSubmitCourse).toHaveBeenCalledWith('c-draft')
  })

  it('allows submitting an individual draft lesson inside an approved course', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/teacher/courses/c-approved']}>
          <Routes>
            <Route path="/teacher/courses/:courseId" element={<TeacherCourseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('2. Summary Completion Tips')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Gửi duyệt bài học' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gửi duyệt' }))

    expect(api.teacherSubmitLesson).toHaveBeenCalledWith('l-draft')
  })

  it('creates, withdraws, archives, and deletes courses on TeacherCoursesPage', async () => {
    const pendingCourse: TeacherCourseSummary = {
      ...draftCourse,
      id: 'c-pending',
      title: 'Speaking Fluency Pending',
      status: 'PENDING_REVIEW',
    }
    const approvedCourse: TeacherCourseSummary = {
      ...draftCourse,
      id: 'c-approved',
      title: 'IELTS Reading Approved',
      status: 'APPROVED',
      publishedAt: '2026-10-01T08:00:00Z',
    }
    vi.mocked(api.teacherCourses).mockResolvedValue({
      items: [draftCourse, pendingCourse, approvedCourse],
      page: 1,
      size: 10,
      total: 3,
      totalPages: 1,
    })
    vi.mocked(api.teacherCreateCourse).mockResolvedValue(approvedCourseDetail)
    vi.mocked(api.teacherWithdrawCourse).mockResolvedValue(approvedCourseDetail)
    vi.mocked(api.teacherArchiveCourse).mockResolvedValue(approvedCourseDetail)
    vi.mocked(api.teacherDeleteCourse).mockResolvedValue(null)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/teacher/courses']}>
          <Routes>
            <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Speaking Fluency Pending')).toBeInTheDocument()

    // Create course
    await userEvent.click(screen.getByRole('button', { name: /Tạo khóa học/ }))
    const createDialog = screen.getByRole('dialog')
    await userEvent.type(within(createDialog).getByLabelText('Tên khóa học'), 'Writing Mastery 8.0')
    await userEvent.selectOptions(within(createDialog).getByLabelText('Danh mục'), 'cat-academic')
    await userEvent.type(within(createDialog).getByLabelText('Thời lượng dự kiến (phút)'), '300')
    await userEvent.click(within(createDialog).getByRole('button', { name: 'Tạo khóa học' }))
    expect(api.teacherCreateCourse).toHaveBeenCalledWith({
      categoryId: 'cat-academic',
      title: 'Writing Mastery 8.0',
      skillFocus: 'READING',
      difficultyLevel: 'INTERMEDIATE',
      estimatedDuration: 300,
      thumbnail: undefined,
      description: undefined,
    })

    // Withdraw pending course
    await userEvent.click(screen.getByRole('button', { name: 'Rút duyệt' }))
    const withdrawDialog = screen.getByRole('dialog')
    await userEvent.click(within(withdrawDialog).getByRole('button', { name: 'Xác nhận rút duyệt' }))
    expect(api.teacherWithdrawCourse).toHaveBeenCalledWith('c-pending')

    // Archive approved course
    await userEvent.click(screen.getByRole('button', { name: 'Lưu trữ' }))
    const archiveDialog = screen.getByRole('dialog')
    await userEvent.click(within(archiveDialog).getByRole('button', { name: 'Lưu trữ khóa học' }))
    expect(api.teacherArchiveCourse).toHaveBeenCalledWith('c-approved')

    // Delete draft course
    const deleteDraftButtons = screen.getAllByRole('button', { name: 'Xóa nháp' })
    await userEvent.click(deleteDraftButtons[0])
    const deleteDialog = screen.getByRole('dialog')
    await userEvent.click(within(deleteDialog).getByRole('button', { name: 'Xóa khóa học' }))
    expect(api.teacherDeleteCourse).toHaveBeenCalledWith('c-draft')
  })

  it('adds sections/lessons, warns on editing approved lesson, withdraws and deletes draft lesson', async () => {
    const courseWithPendingLesson: AdminCourseDetail = {
      ...approvedCourseDetail,
      sections: [
        {
          id: 's-1',
          title: 'Getting started',
          ordering: 1,
          lessons: [
            approvedCourseDetail.sections[0].lessons[0],
            {
              id: 'l-pending',
              sectionId: 's-1',
              title: 'Heading Matching Pending',
              lessonType: 'VIDEO',
              ordering: 2,
              isPreview: false,
              status: 'PENDING_REVIEW',
            },
            approvedCourseDetail.sections[0].lessons[1],
          ],
        },
      ],
    }
    vi.mocked(api.teacherCourseDetail).mockResolvedValue(courseWithPendingLesson)
    vi.mocked(api.teacherCreateSection).mockResolvedValue({
      id: 's-new',
      title: 'Module 2',
      ordering: 2,
      lessons: [],
    })
    vi.mocked(api.teacherCreateLesson).mockResolvedValue({
      id: 'l-new',
      sectionId: 's-1',
      title: 'New Video Lesson',
      lessonType: 'VIDEO',
      ordering: 4,
      isPreview: false,
      status: 'DRAFT',
    })
    vi.mocked(api.teacherUpdateLesson).mockResolvedValue({
      ...courseWithPendingLesson.sections[0].lessons[0],
      status: 'DRAFT',
    })
    vi.mocked(api.teacherWithdrawLesson).mockResolvedValue({
      id: 'l-pending',
      title: 'Heading Matching Pending',
      teacherName: 'Nguyễn Minh Anh',
      status: 'DRAFT',
      submittedAt: null,
      waitingDays: 0,
    })
    vi.mocked(api.teacherDeleteLesson).mockResolvedValue(null)

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/teacher/courses/c-approved']}>
          <Routes>
            <Route path="/teacher/courses/:courseId" element={<TeacherCourseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('1. Intro Reading')).toBeInTheDocument()

    // Add section
    await userEvent.click(screen.getByRole('button', { name: 'Thêm chương' }))
    const sectionDialog = screen.getByRole('dialog')
    await userEvent.type(within(sectionDialog).getByLabelText('Tên chương'), 'Module 2')
    await userEvent.click(within(sectionDialog).getByRole('button', { name: 'Thêm chương' }))
    expect(api.teacherCreateSection).toHaveBeenCalledWith('c-approved', {
      title: 'Module 2',
      description: undefined,
      ordering: undefined,
    })

    // Add lesson with minute-to-second conversion (12 -> 720)
    await userEvent.click(screen.getByRole('button', { name: 'Thêm bài học' }))
    const createLessonDialog = screen.getByRole('dialog')
    await userEvent.type(within(createLessonDialog).getByLabelText('Tên bài học'), 'New Video Lesson')
    await userEvent.type(within(createLessonDialog).getByLabelText('Thời lượng video (phút)'), '12')
    await userEvent.click(within(createLessonDialog).getByRole('button', { name: 'Thêm bài học' }))
    expect(api.teacherCreateLesson).toHaveBeenCalledWith('s-1', {
      title: 'New Video Lesson',
      lessonType: 'VIDEO',
      videoUrl: undefined,
      videoDuration: 720,
      documentUrl: undefined,
      ordering: undefined,
      isPreview: false,
    })

    // Edit approved lesson -> shows reset-to-draft warning
    const editLessonButtons = screen.getAllByRole('button', { name: 'Sửa' })
    await userEvent.click(editLessonButtons[0])
    const editLessonDialog = screen.getByRole('dialog')
    expect(
      within(editLessonDialog).getByText(/tự động chuyển về/i),
    ).toBeInTheDocument()
    const titleInput = within(editLessonDialog).getByLabelText('Tên bài học')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Intro Reading v2')
    await userEvent.click(within(editLessonDialog).getByRole('button', { name: 'Lưu bài học' }))
    expect(api.teacherUpdateLesson).toHaveBeenCalledWith('l-1', {
      title: 'Intro Reading v2',
      lessonType: 'VIDEO',
      videoUrl: undefined,
      videoDuration: undefined,
      documentUrl: undefined,
      ordering: 1,
      isPreview: true,
    })

    // Withdraw pending lesson
    await userEvent.click(screen.getByRole('button', { name: 'Rút duyệt' }))
    const withdrawDialog = screen.getByRole('dialog')
    await userEvent.click(within(withdrawDialog).getByRole('button', { name: 'Xác nhận rút duyệt' }))
    expect(api.teacherWithdrawLesson).toHaveBeenCalledWith('l-pending')

    // Delete draft lesson
    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }))
    const deleteDialog = screen.getByRole('dialog')
    await userEvent.click(within(deleteDialog).getByRole('button', { name: 'Xóa bài học' }))
    expect(api.teacherDeleteLesson).toHaveBeenCalledWith('l-draft')
  })
})
