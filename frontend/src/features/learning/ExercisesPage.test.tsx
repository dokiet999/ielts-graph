import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Pagination } from '@/components/ui/pagination'
import { api } from '@/lib/api'
import type { ExerciseSummary } from '@/lib/types'
import { ExercisePager } from '../submissions/ExercisePager'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      sectionExercises: vi.fn(),
    },
  }
})

const makeExercises = (count: number): ExerciseSummary[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `ex-${i + 1}`,
    title: `Exercise ${i + 1}`,
    skillType: 'READING',
    exerciseType: 'PRACTICE',
    timeLimit: 20,
    maxAttempts: 2,
    passingScore: 5,
    ordering: i + 1,
    questionCount: 10,
    attemptsUsed: 0,
    bestScore: null,
    latestSubmissionId: null,
    latestSubmissionStatus: null,
  }))

describe('Pagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} totalItems={4} pageSize={6} onPageChange={() => {}} />,
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
})

