import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { api } from '@/lib/api'
import type { TeacherExerciseDetail, TeacherLessonExercises } from '@/lib/types'
import { TeacherExerciseEditorPage } from './TeacherExerciseEditorPage'
import { TeacherLessonExercisesPage } from './TeacherLessonExercisesPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      teacherLessonExercises: vi.fn(),
      teacherCreateExercise: vi.fn(),
      teacherUpdateExercise: vi.fn(),
      teacherDeleteExercise: vi.fn(),
      teacherExerciseDetail: vi.fn(),
      teacherReplaceExerciseQuestions: vi.fn(),
    },
  }
})

const lessonExercisesFixture: TeacherLessonExercises = {
  lessonId: 'l-1',
  lessonTitle: 'Intro Reading',
  lessonStatus: 'DRAFT',
  sectionId: 's-1',
  sectionTitle: 'Getting started',
  courseId: 'c-1',
  courseTitle: 'IELTS Reading Foundations',
  courseStatus: 'DRAFT',
  courseSkillFocus: 'READING',
  exercises: [
    {
      id: 'ex-1',
      lessonId: 'l-1',
      title: 'Passage 1 Practice',
      instruction: 'Answer 1-2.',
      audioUrl: null,
      exerciseType: 'PRACTICE',
      skillType: 'READING',
      timeLimit: 1200,
      maxAttempts: 3,
      passingScore: 1,
      ordering: 1,
      questionCount: 2,
      submissionCount: 0,
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-01T08:00:00Z',
    },
  ],
}

const readingExerciseDetail: TeacherExerciseDetail = {
  id: 'ex-1',
  lessonId: 'l-1',
  lessonTitle: 'Intro Reading',
  lessonStatus: 'DRAFT',
  sectionId: 's-1',
  sectionTitle: 'Getting started',
  courseId: 'c-1',
  courseTitle: 'IELTS Reading Foundations',
  courseStatus: 'DRAFT',
  title: 'Passage 1 Practice',
  instruction: 'Answer Questions 1.',
  audioUrl: null,
  content: {
    passageTitle: 'Urban Gardens',
    paragraphs: [{ label: 'A', text: 'Rooftop farms save energy.' }],
  },
  exerciseType: 'PRACTICE',
  skillType: 'READING',
  timeLimit: 1200,
  maxAttempts: 3,
  passingScore: 1,
  ordering: 1,
  submissionCount: 0,
  totalQuestions: 0,
  questionGroups: [],
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
}

describe('TeacherLessonExercisesPage & TeacherExerciseEditorPage', () => {
  beforeEach(() => {
    vi.mocked(api.teacherLessonExercises).mockReset()
    vi.mocked(api.teacherCreateExercise).mockReset()
    vi.mocked(api.teacherUpdateExercise).mockReset()
    vi.mocked(api.teacherDeleteExercise).mockReset()
    vi.mocked(api.teacherExerciseDetail).mockReset()
    vi.mocked(api.teacherReplaceExerciseQuestions).mockReset()

    vi.mocked(api.teacherLessonExercises).mockResolvedValue(lessonExercisesFixture)
    vi.mocked(api.teacherCreateExercise).mockResolvedValue({
      ...readingExerciseDetail,
      id: 'ex-new',
      title: 'Reading New Quiz',
    })
    vi.mocked(api.teacherDeleteExercise).mockResolvedValue(null)
    vi.mocked(api.teacherExerciseDetail).mockResolvedValue(readingExerciseDetail)
    vi.mocked(api.teacherUpdateExercise).mockResolvedValue(readingExerciseDetail)
  })

  it('lists, creates (converting minutes to seconds), and deletes lesson exercises', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/teacher/lessons/l-1/exercises']}>
          <Routes>
            <Route path="/teacher/lessons/:lessonId/exercises" element={<TeacherLessonExercisesPage />} />
            <Route path="/teacher/exercises/:exerciseId" element={<div>Editor</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('1. Passage 1 Practice')).toBeInTheDocument()
    expect(screen.getByText('2 câu hỏi')).toBeInTheDocument()

    // Create new exercise (verify delete before navigating away or create after delete)
    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }))
    const deleteDialog = screen.getByRole('dialog')
    await userEvent.click(within(deleteDialog).getByRole('button', { name: 'Xóa bài tập' }))
    expect(api.teacherDeleteExercise).toHaveBeenCalledWith('ex-1')

    await userEvent.click(screen.getByRole('button', { name: 'Thêm bài tập' }))
    const createDialog = screen.getByRole('dialog')
    await userEvent.type(within(createDialog).getByLabelText('Tên bài tập'), 'Reading New Quiz')
    await userEvent.type(within(createDialog).getByLabelText('Thời gian (phút)'), '15')
    await userEvent.click(within(createDialog).getByRole('button', { name: 'Tạo bài tập' }))

    expect(api.teacherCreateExercise).toHaveBeenCalledWith(
      'l-1',
      expect.objectContaining({
        title: 'Reading New Quiz',
        skillType: 'READING',
        exerciseType: 'LESSON',
        timeLimit: 900,
        maxAttempts: 3,
      }),
    )
  })

  it('updates Reading passage content and saves question groups with answer key', async () => {
    vi.mocked(api.teacherReplaceExerciseQuestions).mockResolvedValue({
      ...readingExerciseDetail,
      totalQuestions: 1,
      questionGroups: [
        {
          id: 'g-1',
          groupTitle: 'Questions 1',
          questionType: 'TRUE_FALSE',
          ordering: 1,
          questions: [
            {
              id: 'q-1',
              questionText: 'Rooftop farms save energy.',
              questionType: 'TRUE_FALSE',
              explanation: 'Paragraph A clearly mentions this.',
              points: 1,
              ordering: 1,
              options: [
                { optionText: 'TRUE', isCorrect: true, ordering: 1 },
                { optionText: 'FALSE', isCorrect: false, ordering: 2 },
                { optionText: 'NOT GIVEN', isCorrect: false, ordering: 3 },
              ],
            },
          ],
        },
      ],
    })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/teacher/exercises/ex-1']}>
          <Routes>
            <Route path="/teacher/exercises/:exerciseId" element={<TeacherExerciseEditorPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByDisplayValue('Urban Gardens')).toBeInTheDocument()

    // Save settings & content
    const titleInput = screen.getByLabelText('Tiêu đề bài đọc')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Urban Gardens v2')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu cài đặt & nội dung' }))

    expect(api.teacherUpdateExercise).toHaveBeenCalledWith(
      'ex-1',
      expect.objectContaining({
        content: {
          passageTitle: 'Urban Gardens v2',
          paragraphs: [{ label: 'A', text: 'Rooftop farms save energy.' }],
        },
      }),
    )

    // Add first question group and save
    await userEvent.click(screen.getByRole('button', { name: 'Thêm nhóm câu hỏi đầu tiên' }))
    await userEvent.type(screen.getByLabelText('Nội dung câu hỏi'), 'Rooftop farms save energy.')
    await userEvent.type(screen.getByLabelText('Giải thích đáp án (tùy chọn)'), 'Paragraph A')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu bộ câu hỏi' }))

    expect(api.teacherReplaceExerciseQuestions).toHaveBeenCalledWith('ex-1', {
      questionGroups: [
        expect.objectContaining({
          groupTitle: 'Nhóm câu hỏi mới',
          questionType: 'MULTIPLE_CHOICE',
          questions: [
            expect.objectContaining({
              questionText: 'Rooftop farms save energy.',
              explanation: 'Paragraph A',
              points: 1,
              ordering: 1,
              options: expect.arrayContaining([
                expect.objectContaining({ optionText: 'Phương án A', isCorrect: true }),
              ]),
            }),
          ],
        }),
      ],
    })
    expect(await screen.findByText(/Đã lưu 1 câu hỏi thành công/i)).toBeInTheDocument()
  })

  it('locks question structure and skill/type when exercise already has submissions', async () => {
    vi.mocked(api.teacherExerciseDetail).mockResolvedValue({
      ...readingExerciseDetail,
      submissionCount: 4,
      totalQuestions: 1,
    })

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/teacher/exercises/ex-1']}>
          <Routes>
            <Route path="/teacher/exercises/:exerciseId" element={<TeacherExerciseEditorPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText(/4 lượt nộp/)).toBeInTheDocument()
    expect(screen.getByLabelText('Kỹ năng')).toBeDisabled()
    expect(screen.getByLabelText('Loại bài tập')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lưu bộ câu hỏi' })).toBeDisabled()
  })
})
