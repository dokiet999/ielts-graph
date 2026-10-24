import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/menu'
import { api } from '@/lib/api'
import type { SpeakingFeedback, SpeakingSubmitResult } from '@/lib/types'
import { exercises } from '@/mocks/fixtures/courses'
import { useSessionStore } from '@/stores/session'
import { useSpeakingResultsStore } from '@/stores/speakingResults'
import { SpeakingRunner } from './SpeakingRunner'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: { submitSpeaking: vi.fn() },
}))

const exercise = exercises.find((e) => e.id === 'ex-i-speaking-01')!

const feedback: SpeakingFeedback = {
  part: 'QT_S_PART2',
  overallBand: 6.0,
  outOfCalibrationRange: false,
  criteria: [],
  summary: 'Bài nói khá trôi chảy.',
  improvements: [],
  transcript: 'Um, I want to talk about a city I visit last year.',
  features: {
    durationSec: 38.4,
    wordCount: 79,
    speechRateWpm: 123.4,
    pauseCount: 3,
    totalPauseSec: 4.2,
    longestPauseSec: 1.6,
  },
  pronunciation: {
    accuracy: 78.5,
    fluency: 72.0,
    completeness: 96.0,
    prosody: 68.0,
  },
}

const graded: SpeakingSubmitResult = {
  submissionId: 'sub-spk-1',
  attemptNumber: 1,
  feedback,
}

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
              element={<SpeakingRunner exercise={exercise} onExit={onExit} />}
            />
            <Route path="/submissions/:id" element={<p>Trang kết quả Speaking</p>} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  )
  return { onExit }
}

const fileInput = () => screen.getByLabelText('Chọn file âm thanh')
const submitButton = () => screen.getByRole('button', { name: 'Nộp bài' })

beforeEach(() => {
  vi.mocked(api.submitSpeaking).mockReset()
  useSessionStore.setState({ sessions: {} })
  useSpeakingResultsStore.setState({ results: {} })
  if (!URL.createObjectURL) {
    URL.createObjectURL = vi.fn(() => 'blob:mock-audio')
  } else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-audio')
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = vi.fn()
  } else {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  }
})

describe('SpeakingRunner', () => {
  it('shows the speaking prompt, part name, and disables submit until audio is provided', () => {
    renderRunner()
    expect(screen.getByText(/Describe a city you visited recently/)).toBeInTheDocument()
    expect(screen.getByText('Speaking Part 2')).toBeInTheDocument()
    expect(submitButton()).toBeDisabled()
  })

  it('rejects unsupported file extensions before calling the backend', () => {
    renderRunner()
    const badFile = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(fileInput(), { target: { files: [badFile] } })
    expect(screen.getByRole('alert')).toHaveTextContent('Định dạng file âm thanh không được hỗ trợ')
    expect(submitButton()).toBeDisabled()
  })

  it('accepts a valid audio file upload, submits, caches feedback, and navigates to result page', async () => {
    vi.mocked(api.submitSpeaking).mockResolvedValue(graded)
    renderRunner()
    const audioFile = new File(['dummy-audio-bytes'], 'answer.webm', { type: 'audio/webm' })
    fireEvent.change(fileInput(), { target: { files: [audioFile] } })

    expect(screen.getByText('answer.webm')).toBeInTheDocument()
    expect(submitButton()).toBeEnabled()

    await userEvent.click(submitButton())
    const dialog = screen.getByRole('dialog', { name: 'Nộp bài nói?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Nộp bài' }))

    expect(await screen.findByText('Trang kết quả Speaking')).toBeInTheDocument()
    expect(api.submitSpeaking).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseId: exercise.id,
        filename: 'answer.webm',
      }),
    )
    expect(useSpeakingResultsStore.getState().results['sub-spk-1']).toEqual(feedback)
  })

  it('shows the AI waiting overlay while grading is in progress', async () => {
    vi.mocked(api.submitSpeaking).mockReturnValue(new Promise(() => {}))
    renderRunner()
    const audioFile = new File(['dummy-audio-bytes'], 'answer.mp3', { type: 'audio/mpeg' })
    fireEvent.change(fileInput(), { target: { files: [audioFile] } })

    await userEvent.click(submitButton())
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Nộp bài' }),
    )
    expect(await screen.findByText('AI đang chấm bài nói của bạn...')).toBeInTheDocument()
  })

  it('keeps the audio file and offers a retry when ASR service is unavailable', async () => {
    vi.mocked(api.submitSpeaking).mockRejectedValueOnce(apiError(503, 'ASR_UNAVAILABLE'))
    vi.mocked(api.submitSpeaking).mockResolvedValueOnce(graded)
    renderRunner()

    const audioFile = new File(['dummy-audio-bytes'], 'answer.wav', { type: 'audio/wav' })
    fireEvent.change(fileInput(), { target: { files: [audioFile] } })
    await userEvent.click(submitButton())
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Nộp bài' }),
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('nhận diện giọng nói tạm thời không khả dụng')
    expect(screen.getByText('answer.wav')).toBeInTheDocument()

    await userEvent.click(within(alert).getByRole('button', { name: 'Thử lại' }))
    await waitFor(() => expect(api.submitSpeaking).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('Trang kết quả Speaking')).toBeInTheDocument()
  })
})
