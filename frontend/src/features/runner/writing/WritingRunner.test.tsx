import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/menu'
import { api } from '@/lib/api'
import type { WritingFeedback, WritingSubmitResult } from '@/lib/types'
import { exercises } from '@/mocks/fixtures/courses'
import { useSessionStore } from '@/stores/session'
import { useWritingResultsStore } from '@/stores/writingResults'
import { ESSAY_KEY, WritingRunner } from './WritingRunner'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: { submitWriting: vi.fn() },
}))

const exercise = exercises.find((e) => e.id === 'ex-i-writing-01')!
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ')

const feedback: WritingFeedback = {
  taskType: 'QT_W2_DISCUSSION',
  overallBand: 6.5,
  outOfCalibrationRange: false,
  criteria: [],
  summary: 'ok',
  improvements: [],
}
const graded: WritingSubmitResult = { submissionId: 'sub-1', attemptNumber: 1, feedback }

function apiError(status: number, code: string) {
  return new AxiosError('failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: { code, message: 'English message' },
  } as never)
}

function renderRunner() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const onExit = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={['/run/ex']}>
          <Routes>
            <Route
              path="/run/:id"
              element={<WritingRunner exercise={exercise} onExit={onExit} />}
            />
            <Route path="/submissions/:id" element={<p>Trang kết quả</p>} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return { onExit }
}

const editor = () => screen.getByRole('textbox', { name: 'Bài viết của bạn' })
const write = (text: string) => fireEvent.change(editor(), { target: { value: text } })
const submitButton = () => screen.getByRole('button', { name: 'Nộp bài' })

beforeEach(() => {
  vi.mocked(api.submitWriting).mockReset()
  useSessionStore.setState({ sessions: {} })
  useWritingResultsStore.setState({ results: {} })
})

describe('WritingRunner', () => {
  it('shows the prompt, the minimum and a live word count', () => {
    renderRunner()
    expect(screen.getByText(/online learning is more effective/)).toBeInTheDocument()
    expect(screen.getByText(/0 \/ 250 từ/)).toBeInTheDocument()
    write('one two three')
    expect(screen.getByText(/3 \/ 250 từ/)).toBeInTheDocument()
    expect(screen.getByText('Chưa đủ số từ tối thiểu')).toBeInTheDocument()
  })

  it('keeps the submit button disabled under 50 words, as the backend would refuse the essay', () => {
    renderRunner()
    write(words(49))
    expect(submitButton()).toBeDisabled()
    expect(screen.getByText(/Cần ít nhất 50 từ để nộp bài/)).toBeInTheDocument()
    write(words(50))
    expect(submitButton()).toBeEnabled()
  })

  it('saves the draft in the session store so a reload keeps it', () => {
    renderRunner()
    write('my draft')
    expect(useSessionStore.getState().sessions[exercise.id].answers[ESSAY_KEY]).toBe('my draft')
  })

  it('warns in the confirm dialog when the essay is under 250 words', async () => {
    renderRunner()
    write(words(60))
    await userEvent.click(submitButton())
    const dialog = screen.getByRole('dialog', { name: 'Nộp bài?' })
    expect(within(dialog).getByText(/Bài chưa đạt 250 từ/)).toBeInTheDocument()
    expect(within(dialog).getByText(/60 từ/)).toBeInTheDocument()
  })

  it('submits the essay, keeps the result for the result page and clears the draft', async () => {
    vi.mocked(api.submitWriting).mockResolvedValue(graded)
    renderRunner()
    const essay = words(60)
    write(essay)
    await userEvent.click(submitButton())
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Nộp bài' }),
    )

    expect(await screen.findByText('Trang kết quả')).toBeInTheDocument()
    expect(api.submitWriting).toHaveBeenCalledWith(
      expect.objectContaining({ exerciseId: exercise.id, essayText: essay }),
    )
    expect(useWritingResultsStore.getState().results['sub-1']).toEqual(feedback)
    expect(useSessionStore.getState().sessions[exercise.id]).toBeUndefined()
  })

  it('shows the AI waiting state while the essay is graded', async () => {
    vi.mocked(api.submitWriting).mockReturnValue(new Promise(() => {}))
    renderRunner()
    write(words(60))
    await userEvent.click(submitButton())
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Nộp bài' }),
    )
    expect(await screen.findByText('AI đang chấm bài của bạn...')).toBeInTheDocument()
  })

  it('keeps the essay and offers a retry when the AI is unavailable', async () => {
    vi.mocked(api.submitWriting).mockRejectedValueOnce(apiError(503, 'LLM_UNAVAILABLE'))
    vi.mocked(api.submitWriting).mockResolvedValueOnce(graded)
    renderRunner()
    const essay = words(60)
    write(essay)
    await userEvent.click(submitButton())
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Nộp bài' }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('quá tải')
    expect(alert).not.toHaveTextContent('English message')
    expect(editor()).toHaveValue(essay)

    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(api.submitWriting).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Trang kết quả')).toBeInTheDocument()
  })

  it('does not offer a retry when the attempt limit is reached', async () => {
    vi.mocked(api.submitWriting).mockRejectedValue(apiError(409, 'MAX_ATTEMPTS_REACHED'))
    renderRunner()
    write(words(60))
    await userEvent.click(submitButton())
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Nộp bài' }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('hết số lần làm')
    expect(within(alert).queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
  })

  it('leaves through the exit button', async () => {
    const { onExit } = renderRunner()
    await userEvent.click(screen.getByRole('button', { name: 'Thoát' }))
    expect(onExit).toHaveBeenCalled()
  })
})
