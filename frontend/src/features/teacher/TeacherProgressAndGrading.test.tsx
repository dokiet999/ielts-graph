import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { AdminStudentDetailPage } from '@/features/admin/AdminStudentDetailPage'
import { FinalTestPage } from '@/features/learning/FinalTestPage'
import { WritingResultPage } from '@/features/submissions/WritingResultPage'
import { api } from '@/lib/api'
import type {
  CourseDetail,
  CourseProgressOverview,
  Section,
  StudentCourseProgressDetail,
  SubmissionDetail,
} from '@/lib/types'
import { CourseFormDialog } from './CourseFormDialog'
import { TeacherCourseStudentsPage } from './TeacherCourseStudentsPage'
import { TeacherStudentDetailPage } from './TeacherStudentDetailPage'
import { TeacherSubmissionReviewPage } from './TeacherSubmissionReviewPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      categories: vi.fn(),
      sectionFinalTest: vi.fn(),
      mySubmissions: vi.fn(),
      adminStudentProgress: vi.fn(),
      adminUnlockStudentFinalTest: vi.fn(),
      adminLockStudentFinalTest: vi.fn(),
      teacherCreateCourse: vi.fn(),
      teacherCourseStudents: vi.fn(),
      teacherStudentProgress: vi.fn(),
      teacherUnlockStudentFinalTest: vi.fn(),
      teacherLockStudentFinalTest: vi.fn(),
      teacherSubmissionDetail: vi.fn(),
      teacherGradeSubmission: vi.fn(),
      kgRecommendations: vi.fn(),
    },
  }
})

const overviewFixture: CourseProgressOverview = {
  courseId: 'c-1',
  courseTitle: 'IELTS Writing Cohort',
  maxStudents: 25,
  activeStudentCount: 1,
  startDate: '2026-10-01T08:00:00',
  endDate: '2026-11-30T20:00:00',
  totalExercises: 4,
  averageProgressPercent: 50,
  completedCount: 0,
  behindOrInactiveCount: 0,
  preEnrolledCount: 0,
  students: [
    {
      studentId: 'u-1',
      fullName: 'Nguyễn Bảo An',
      username: 'baoan',
      email: 'baoan@example.com',
      enrolledAt: '2026-10-02T09:00:00',
      completedAt: null,
      completedExercises: 2,
      totalExercises: 4,
      progressPercent: 50,
      averageScore: 72.5,
      totalSubmissions: 2,
      pendingReviewCount: 1,
      lastSubmittedAt: '2026-10-20T14:00:00',
      scheduleStatus: 'ON_TRACK',
    },
  ],
}

const studentDetailFixture: StudentCourseProgressDetail = {
  courseId: 'c-1',
  courseTitle: 'IELTS Writing Cohort',
  startDate: '2026-10-01T08:00:00',
  endDate: '2026-11-30T20:00:00',
  maxStudents: 25,
  studentId: 'u-1',
  fullName: 'Nguyễn Bảo An',
  username: 'baoan',
  email: 'baoan@example.com',
  enrolledAt: '2026-10-02T09:00:00',
  completedAt: null,
  completedExercises: 2,
  totalExercises: 4,
  progressPercent: 50,
  averageScore: 72.5,
  lastSubmittedAt: '2026-10-20T14:00:00',
  scheduleStatus: 'ON_TRACK',
  sections: [
    {
      sectionId: 'sec-1',
      title: 'Task 2 Essays',
      ordering: 1,
      completedExercises: 2,
      totalExercises: 4,
      finalTest: {
        exerciseId: 'ft-1',
        exerciseTitle: 'Writing Section Final Test',
        unlocked: false,
        grantExpired: false,
        deadlineDays: null,
        unlockedAt: null,
        grantExpiresAt: null,
        attemptCount: 0,
        bestScore: null,
        latestSubmissionId: null,
      },
      lessons: [
        {
          lessonId: 'les-1',
          title: 'Opinion Essay',
          lessonType: 'VIDEO',
          ordering: 1,
          completedExercises: 1,
          totalExercises: 1,
          exercises: [
            {
              exerciseId: 'ex-w1',
              title: 'Essay Practice 1',
              exerciseType: 'PRACTICE',
              skillType: 'WRITING',
              questionCount: 1,
              maxScore: 9,
              attemptCount: 1,
              bestScore: 6.5,
              completed: true,
              latestSubmissionId: 'sub-w1',
              latestStatus: 'GRADED',
              lastSubmittedAt: '2026-10-20T14:00:00',
              hasTeacherFeedback: false,
            },
          ],
        },
      ],
    },
  ],
  submissions: [
    {
      id: 'sub-w1',
      exerciseId: 'ex-w1',
      exerciseTitle: 'Essay Practice 1',
      skillType: 'WRITING',
      exerciseType: 'PRACTICE',
      attemptNumber: 1,
      status: 'GRADED',
      score: 6.5,
      maxScore: 9,
      aiScore: 6.5,
      teacherScore: null,
      teacherFeedback: null,
      gradingMethod: 'AI',
      gradedByName: null,
      gradedAt: null,
      submittedAt: '2026-10-20T14:00:00',
      timeSpent: 900,
    },
  ],
}

const writingSubmissionFixture: SubmissionDetail = {
  id: 'sub-w1',
  exerciseId: 'ex-w1',
  exerciseTitle: 'Essay Practice 1',
  skillType: 'WRITING',
  exerciseType: 'PRACTICE',
  courseId: 'c-1',
  sectionId: 'sec-1',
  attemptNumber: 1,
  status: 'GRADED',
  score: 6.5,
  maxScore: 9,
  aiScore: 6.5,
  teacherScore: null,
  teacherFeedback: null,
  gradingMethod: 'AI',
  gradedByName: null,
  gradedAt: null,
  correctCount: 0,
  questionCount: 1,
  timeSpent: 900,
  submittedAt: '2026-10-20T14:00:00',
  studentId: 'u-1',
  studentName: 'Nguyễn Bảo An',
  studentEmail: 'baoan@example.com',
  answers: {},
  results: [],
  essayText: 'Sample IELTS essay body paragraph.',
  writingFeedback: {
    taskType: 'QT_W2_DISCUSSION',
    overallBand: 6.5,
    outOfCalibrationRange: false,
    criteria: [],
    summary: 'Good essay structure.',
    improvements: ['Expand examples.'],
  },
  exercise: {
    id: 'ex-w1',
    lessonId: 'les-1',
    sectionId: 'sec-1',
    courseId: 'c-1',
    title: 'Essay Practice 1',
    instruction: null,
    audioUrl: null,
    content: null,
    exerciseType: 'PRACTICE',
    skillType: 'WRITING',
    timeLimit: 1800,
    maxAttempts: 3,
    questionGroups: [],
  },
}

describe('LMS course capacity/schedule, progress tracking and teacher grading', () => {
  beforeEach(() => {
    vi.mocked(api.categories).mockReset()
    vi.mocked(api.sectionFinalTest).mockReset()
    vi.mocked(api.mySubmissions).mockReset()
    vi.mocked(api.adminStudentProgress).mockReset()
    vi.mocked(api.adminUnlockStudentFinalTest).mockReset()
    vi.mocked(api.adminLockStudentFinalTest).mockReset()
    vi.mocked(api.teacherCreateCourse).mockReset()
    vi.mocked(api.teacherCourseStudents).mockReset()
    vi.mocked(api.teacherStudentProgress).mockReset()
    vi.mocked(api.teacherUnlockStudentFinalTest).mockReset()
    vi.mocked(api.teacherLockStudentFinalTest).mockReset()
    vi.mocked(api.teacherSubmissionDetail).mockReset()
    vi.mocked(api.teacherGradeSubmission).mockReset()
    vi.mocked(api.kgRecommendations).mockReset()

    vi.mocked(api.categories).mockResolvedValue([
      {
        id: 'cat-1',
        name: 'Academic',
        slug: 'academic',
        isActive: true,
        ordering: 1,
        courseCount: 1,
        createdAt: '2026-10-01T00:00:00',
        updatedAt: '2026-10-01T00:00:00',
      },
    ])
    vi.mocked(api.teacherCourseStudents).mockResolvedValue(overviewFixture)
    vi.mocked(api.teacherStudentProgress).mockResolvedValue(studentDetailFixture)
    vi.mocked(api.adminStudentProgress).mockResolvedValue(studentDetailFixture)
    vi.mocked(api.mySubmissions).mockResolvedValue([])
    vi.mocked(api.sectionFinalTest).mockResolvedValue({
      exercise: {
        id: 'ft-1',
        lessonId: 'les-1',
        lessonTitle: 'Opinion Essay',
        sectionId: 'sec-1',
        title: 'Writing Section Final Test',
        exerciseType: 'FINAL_TEST',
        skillType: 'WRITING',
        timeLimit: 2400,
        questionCount: 1,
        attemptCount: 0,
        bestScore: null,
        maxScore: 9,
        lastSubmissionId: null,
      },
      unlocked: false,
      grantExpired: false,
      deadlineDays: null,
      unlockedAt: null,
      grantExpiresAt: null,
      activeSession: null,
    })
    vi.mocked(api.adminUnlockStudentFinalTest).mockResolvedValue({
      exerciseId: 'ft-1',
      exerciseTitle: 'Writing Section Final Test',
      unlocked: true,
      grantExpired: false,
      deadlineDays: 30,
      unlockedAt: '2026-10-21T09:00:00',
      grantExpiresAt: '2026-11-20T09:00:00',
      attemptCount: 0,
      bestScore: null,
      latestSubmissionId: null,
    })
    vi.mocked(api.adminLockStudentFinalTest).mockResolvedValue({
      exerciseId: 'ft-1',
      exerciseTitle: 'Writing Section Final Test',
      unlocked: false,
      grantExpired: false,
      deadlineDays: null,
      unlockedAt: null,
      grantExpiresAt: null,
      attemptCount: 0,
      bestScore: null,
      latestSubmissionId: null,
    })
    vi.mocked(api.teacherUnlockStudentFinalTest).mockResolvedValue({
      exerciseId: 'ft-1',
      exerciseTitle: 'Writing Section Final Test',
      unlocked: true,
      grantExpired: false,
      deadlineDays: 14,
      unlockedAt: '2026-10-21T09:00:00',
      grantExpiresAt: '2026-11-04T09:00:00',
      attemptCount: 0,
      bestScore: null,
      latestSubmissionId: null,
    })
    vi.mocked(api.teacherSubmissionDetail).mockResolvedValue(writingSubmissionFixture)
    vi.mocked(api.teacherGradeSubmission).mockResolvedValue({
      ...writingSubmissionFixture,
      score: 7.5,
      teacherScore: 7.5,
      teacherFeedback: 'Lập luận mạch lạc, cần đa dạng từ nối hơn.',
      gradingMethod: 'TEACHER',
      gradedByName: 'Nguyễn Minh Anh',
      gradedAt: '2026-10-21T10:00:00',
    })
    vi.mocked(api.kgRecommendations).mockResolvedValue({
      skill: 'SKILL_W',
      bandRequested: 6.5,
      bandApplied: 6,
      recommendations: [],
      unmatchedErrors: [],
    })
  })

  it('validates schedule date range and submits optional capacity and schedule on course form', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <CourseFormDialog open onOpenChange={() => {}} />
      </QueryClientProvider>,
    )

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Tên khóa học'), 'IELTS Intensive Cohort')
    await userEvent.selectOptions(within(dialog).getByLabelText('Danh mục'), 'cat-1')
    await userEvent.type(within(dialog).getByLabelText('Sĩ số tối đa (tùy chọn)'), '25')
    await userEvent.type(
      within(dialog).getByLabelText('Ngày bắt đầu (tùy chọn)'),
      '2026-12-10T09:00',
    )
    await userEvent.type(
      within(dialog).getByLabelText('Ngày kết thúc (tùy chọn)'),
      '2026-12-01T09:00',
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo khóa học' }))

    expect(
      await within(dialog).findByText('Thời gian kết thúc phải sau thời gian bắt đầu'),
    ).toBeInTheDocument()
    expect(api.teacherCreateCourse).not.toHaveBeenCalled()

    const endInput = within(dialog).getByLabelText('Ngày kết thúc (tùy chọn)')
    await userEvent.clear(endInput)
    await userEvent.type(endInput, '2026-12-30T18:00')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo khóa học' }))

    expect(api.teacherCreateCourse).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'IELTS Intensive Cohort',
        maxStudents: 25,
        startDate: '2026-12-10T09:00:00',
        endDate: '2026-12-30T18:00:00',
      }),
    )
  })

  it('displays class roster progress, drills down to student detail, and unlocks Final Test', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/teacher/courses/c-1/students']}>
          <Routes>
            <Route
              path="/teacher/courses/:courseId/students"
              element={<TeacherCourseStudentsPage />}
            />
            <Route
              path="/teacher/courses/:courseId/students/:studentId"
              element={<TeacherStudentDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Nguyễn Bảo An')).toBeInTheDocument()
    expect(screen.getByText('1 / 25')).toBeInTheDocument()
    expect(screen.getByText('1 bài chờ nhận xét')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: /Chi tiết/i }))
    expect(await screen.findByText('Tiến độ từng chương & Mở khóa Final Test')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Mở khóa Final Test/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.selectOptions(within(dialog).getByLabelText('Thời hạn hoàn thành'), '14')
    await userEvent.click(within(dialog).getByRole('button', { name: /Xác nhận mở khóa/i }))

    expect(api.teacherUnlockStudentFinalTest).toHaveBeenCalledWith('c-1', 'sec-1', 'u-1', 14)
  })

  it('grades and submits teacher feedback and displays TeacherFeedbackCard on student result', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { unmount } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/teacher/submissions/sub-w1?courseId=c-1&studentId=u-1']}>
          <Routes>
            <Route
              path="/teacher/submissions/:submissionId"
              element={<TeacherSubmissionReviewPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Sample IELTS essay body paragraph.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/Điểm giáo viên/i), '7.5')
    await userEvent.type(
      screen.getByLabelText(/Nhận xét chuyên môn/i),
      'Lập luận mạch lạc, cần đa dạng từ nối hơn.',
    )
    await userEvent.click(screen.getByRole('button', { name: /Lưu đánh giá giáo viên/i }))

    expect(api.teacherGradeSubmission).toHaveBeenCalledWith('sub-w1', {
      teacherScore: 7.5,
      teacherFeedback: 'Lập luận mạch lạc, cần đa dạng từ nối hơn.',
    })
    expect(
      await screen.findByText(/Đã lưu điểm và nhận xét của giáo viên thành công/i),
    ).toBeInTheDocument()

    unmount()

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <WritingResultPage
            sub={{
              ...writingSubmissionFixture,
              score: 7.5,
              teacherScore: 7.5,
              teacherFeedback: 'Lập luận mạch lạc, cần đa dạng từ nối hơn.',
              gradingMethod: 'TEACHER',
              gradedByName: 'Nguyễn Minh Anh',
              gradedAt: '2026-10-21T10:00:00',
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Đánh giá của giảng viên')).toBeInTheDocument()
    expect(screen.getByText(/Điểm giảng viên: Band 7.5/i)).toBeInTheDocument()
    expect(screen.getByText('Lập luận mạch lạc, cần đa dạng từ nối hơn.')).toBeInTheDocument()
  })

  it('does not render hardcoded Admin unlock panel on learner FinalTestPage', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const sectionFixture: Section = {
      id: 'sec-1',
      courseId: 'c-1',
      title: 'Task 2 Essays',
      description: null,
      ordering: 1,
      lessons: [],
      exerciseCount: 4,
      completedExerciseCount: 2,
    }
    const courseFixture: CourseDetail = {
      id: 'c-1',
      title: 'IELTS Writing Cohort',
      description: null,
      thumbnail: null,
      level: 'INTERMEDIATE',
      categoryName: 'Academic',
      teacher: { id: 't-1', fullName: 'Nguyễn Minh Anh', avatarUrl: null },
      estimatedDuration: 120,
      maxStudents: 25,
      startDate: '2026-10-01T08:00:00',
      endDate: '2026-11-30T20:00:00',
      enrollmentCount: 1,
      enrollmentStatus: 'IN_PROGRESS',
      enrolledAt: '2026-10-02T09:00:00',
      completedAt: null,
      sectionCount: 1,
      exerciseCount: 4,
      completedExerciseCount: 2,
      sections: [sectionFixture],
    }

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/learn/c-1/sec-1/final-test']}>
          <Routes>
            <Route element={<Outlet context={{ course: courseFixture, section: sectionFixture }} />}>
              <Route path="/learn/:courseId/:sectionId/final-test" element={<FinalTestPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      await screen.findByText('Bài Final test đang khóa — Chờ cấp quyền mở bài'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Đang khóa \(Chờ mở đề\)/i })).toBeDisabled()
    expect(screen.queryByText(/Bảng điều khiển Admin/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cho phép mở bài/i })).not.toBeInTheDocument()
  })

  it('allows Admin to unlock and lock student Final Test from AdminStudentDetailPage', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/admin/courses/c-1/students/u-1']}>
          <Routes>
            <Route
              path="/admin/courses/:courseId/students/:studentId"
              element={<AdminStudentDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Tiến độ từng chương & Cấp quyền Final Test')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Mở khóa Final Test/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.selectOptions(within(dialog).getByLabelText('Thời hạn hoàn thành'), '30')
    await userEvent.click(within(dialog).getByRole('button', { name: /Xác nhận mở khóa/i }))

    expect(api.adminUnlockStudentFinalTest).toHaveBeenCalledWith('c-1', 'sec-1', 'u-1', 30)

    vi.mocked(api.adminStudentProgress).mockResolvedValue({
      ...studentDetailFixture,
      sections: [
        {
          ...studentDetailFixture.sections[0],
          finalTest: {
            exerciseId: 'ft-1',
            exerciseTitle: 'Writing Section Final Test',
            unlocked: true,
            grantExpired: false,
            deadlineDays: 30,
            unlockedAt: '2026-10-21T09:00:00',
            grantExpiresAt: '2026-11-20T09:00:00',
            attemptCount: 0,
            bestScore: null,
            latestSubmissionId: null,
          },
        },
      ],
    })
    await qc.invalidateQueries({ queryKey: ['admin', 'courses', 'c-1', 'students', 'u-1'] })
    rerender(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/admin/courses/c-1/students/u-1']}>
          <Routes>
            <Route
              path="/admin/courses/:courseId/students/:studentId"
              element={<AdminStudentDetailPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const lockBtn = await screen.findByRole('button', { name: /Khóa Final Test/i })
    await userEvent.click(lockBtn)
    expect(api.adminLockStudentFinalTest).toHaveBeenCalledWith('c-1', 'sec-1', 'u-1')
  })
})
