import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Pagination } from '@/components/ui/pagination'
import { api } from '@/lib/api'
import type { ExerciseSummary } from '@/lib/types'
import { useSessionStore } from '@/stores/session'
import { ExercisePager } from '../submissions/ExercisePager'
import { ExerciseCard } from './ExerciseCard'
import { bandToCefr, FinalTestResultCard } from './FinalTestResultCard'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      sectionExercises: vi.fn(),
      sectionMockTests: vi.fn(),
    },
  }
})

const makeExercises = (count: number): ExerciseSummary[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `ex-${i + 1}`,
    lessonId: `l-${i + 1}`,
    sectionId: 'sec-1',
    title: `Exercise ${i + 1}`,
    skillType: 'READING',
    exerciseType: 'PRACTICE',
    timeLimit: 20,
    questionCount: 10,
    attemptCount: 0,
    bestScore: null,
    maxScore: 10,
    lastSubmissionId: null,
  }))

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} totalItems={4} pageSize={6} onPageChange={() => { }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows item range and calls onPageChange when clicking next or a page number', async () => {
    const onPageChange = vi.fn()
    render(
      <Pagination
        page={1}
        totalPages={3}
        totalItems={14}
        pageSize={6}
        onPageChange={onPageChange}
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Phân trang' })).toHaveTextContent(
      'Hiển thị 1–6 trên 14 bài luyện',
    )
    expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Trang 1' })).toHaveAttribute('aria-current', 'page')

    await userEvent.click(screen.getByRole('button', { name: 'Trang 2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)

    await userEvent.click(screen.getByRole('button', { name: 'Trang tiếp' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})

describe('ExercisePager', () => {
  beforeEach(() => vi.mocked(api.sectionExercises).mockReset())

  it('renders previous and next exercise links for an exercise in a section', async () => {
    vi.mocked(api.sectionExercises).mockResolvedValue(makeExercises(3))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ExercisePager sectionId="sec-1" exerciseId="ex-2" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const nav = await screen.findByRole('navigation', { name: 'Điều hướng bài luyện' })
    expect(nav).toHaveTextContent('Bài luyện 2/3')
    expect(screen.getByRole('link', { name: /Bài luyện trước/ })).toHaveAttribute(
      'href',
      '/run/ex-1',
    )
    expect(screen.getByRole('link', { name: /Bài luyện tiếp theo/ })).toHaveAttribute(
      'href',
      '/run/ex-3',
    )
  })

  it('uses sectionMockTests when exerciseType is MOCK_TEST', async () => {
    vi.mocked(api.sectionMockTests).mockResolvedValue(
      makeExercises(2).map((e) => ({ ...e, exerciseType: 'MOCK_TEST' })),
    )
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ExercisePager sectionId="sec-1" exerciseId="ex-1" exerciseType="MOCK_TEST" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const nav = await screen.findByRole('navigation', { name: 'Điều hướng bài thi thử' })
    expect(nav).toHaveTextContent('Bài thi thử 1/2')
    expect(screen.getByRole('link', { name: /Bài thi thử tiếp theo/ })).toHaveAttribute(
      'href',
      '/run/ex-2',
    )
  })
})

describe('ExerciseCard for MOCK_TEST', () => {
  it('displays converted IELTS Band Score for Reading/Listening mock tests', () => {
    render(
      <MemoryRouter>
        <ExerciseCard
          exercise={{
            id: 'mock-r1',
            lessonId: 'l1',
            sectionId: 's1',
            title: 'Reading Mock Test 1',
            skillType: 'READING',
            exerciseType: 'MOCK_TEST',
            timeLimit: 1200,
            questionCount: 13,
            attemptCount: 1,
            bestScore: 10,
            maxScore: 13,
            lastSubmissionId: 'sub-1',
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Thi thử')).toBeInTheDocument()
    expect(screen.getByText('Band tốt nhất 7.0 (10/13)')).toBeInTheDocument()
  })

  it('displays Vào làm tiếp badge when exercise is in progress', () => {
    useSessionStore.setState({ sessions: {} })
    useSessionStore.getState().ensure('mock-r2', { title: 'Reading Mock Test 2', questionCount: 13 })
    useSessionStore.getState().markInProgress('mock-r2')

    render(
      <MemoryRouter>
        <ExerciseCard
          exercise={{
            id: 'mock-r2',
            lessonId: 'l1',
            sectionId: 's1',
            title: 'Reading Mock Test 2',
            skillType: 'READING',
            exerciseType: 'MOCK_TEST',
            timeLimit: 1200,
            questionCount: 13,
            attemptCount: 0,
            bestScore: null,
            maxScore: 13,
            lastSubmissionId: null,
          }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Đang làm 0/13')).toBeInTheDocument()
    expect(screen.getByText(/Vào làm tiếp/)).toBeInTheDocument()
  })

  it('tracks wall-clock startedAt for FINAL_TEST sessions across exits', () => {
    useSessionStore.setState({ sessions: {} })
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    useSessionStore.getState().ensure('final-r1', { title: 'Reading Final Test', questionCount: 13 })
    useSessionStore.getState().markStartedWallClock('final-r1', fiveMinutesAgo)

    const session = useSessionStore.getState().sessions['final-r1']
    expect(session?.inProgress).toBe(true)
    expect(session?.startedAt).toBe(fiveMinutesAgo)
    expect(session?.elapsed).toBeGreaterThanOrEqual(299)
  })
})

describe('FinalTestResultCard', () => {
  it('renders post-exam result card with Overall band, 4 skills, Đã chấm badge, Xem kết quả link, and CEFR scale comparison', () => {
    expect(bandToCefr(6.0)).toBe('B2')
    expect(bandToCefr(7.5)).toBe('C1')
    expect(bandToCefr(8.5)).toBe('C2')

    render(
      <MemoryRouter>
        <FinalTestResultCard
          exercise={{
            id: 'final-w1',
            lessonId: 'l-i3-1',
            sectionId: 's-i3',
            title: 'Final Test - IELTS Writing 6.0',
            skillType: 'WRITING',
            exerciseType: 'FINAL_TEST',
            timeLimit: 2400,
            questionCount: 1,
            attemptCount: 1,
            bestScore: 6.5,
            maxScore: 9,
            lastSubmissionId: 'sub-final-w1',
          }}
          currentBand={6.5}
          latestSubmission={{
            id: 'sub-final-w1',
            exerciseId: 'final-w1',
            exerciseTitle: 'Final Test - IELTS Writing 6.0',
            skillType: 'WRITING',
            exerciseType: 'FINAL_TEST',
            courseId: 'c-intensive',
            attemptNumber: 1,
            status: 'GRADED',
            score: 6.5,
            maxScore: 9,
            correctCount: 0,
            questionCount: 1,
            bandScore: 6.5,
            timeSpent: 1933,
            submittedAt: '2025-10-20T10:00:00Z',
          }}
          allSubmissions={[
            {
              id: 'sub-final-l1',
              exerciseId: 'final-l1',
              exerciseTitle: 'Listening Final Test',
              skillType: 'LISTENING',
              exerciseType: 'FINAL_TEST',
              courseId: 'c-intensive',
              attemptNumber: 1,
              status: 'GRADED',
              score: 5.5,
              maxScore: 9,
              correctCount: 20,
              questionCount: 40,
              bandScore: 5.5,
              timeSpent: 1500,
              submittedAt: '2025-10-18T10:00:00Z',
            },
            {
              id: 'sub-final-r1',
              exerciseId: 'final-r1',
              exerciseTitle: 'Reading Final Test',
              skillType: 'READING',
              exerciseType: 'FINAL_TEST',
              courseId: 'c-intensive',
              attemptNumber: 1,
              status: 'GRADED',
              score: 6.5,
              maxScore: 9,
              correctCount: 27,
              questionCount: 40,
              bandScore: 6.5,
              timeSpent: 1800,
              submittedAt: '2025-10-19T10:00:00Z',
            },
            {
              id: 'sub-final-s1',
              exerciseId: 'final-s1',
              exerciseTitle: 'Speaking Final Test',
              skillType: 'SPEAKING',
              exerciseType: 'FINAL_TEST',
              courseId: 'c-intensive',
              attemptNumber: 1,
              status: 'GRADED',
              score: 5.5,
              maxScore: 9,
              correctCount: 0,
              questionCount: 1,
              bandScore: 5.5,
              timeSpent: 120,
              submittedAt: '2025-10-19T12:00:00Z',
            },
          ]}
          courseId="c-intensive"
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Final Test - IELTS Writing 6.0')).toBeInTheDocument()
    expect(screen.getByText('Đã chấm')).toBeInTheDocument()
    expect(screen.getByText('32m 13s')).toBeInTheDocument()
    expect(screen.getByText('20/10/2025')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Xem kết quả/ })).toHaveAttribute(
      'href',
      '/submissions/sub-final-w1',
    )
    expect(screen.getByLabelText('Overall band 6.0')).toHaveTextContent('6.0')
    expect(screen.getByRole('group', { name: 'Mức CEFR hiện tại: B2' })).toBeInTheDocument()
  })
})

