import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { SpeakingFeedback, SubmissionDetail } from '@/lib/types'
import { exercises } from '@/mocks/fixtures/courses'
import { useSpeakingResultsStore } from '@/stores/speakingResults'
import { SpeakingResultPage } from './SpeakingResultPage'

const transcript =
  'Um, I want to talk about a city I visit last year, it is Da Nang. Also, the food is, the food was really delicious.'

const feedback: SpeakingFeedback = {
  part: 'QT_S_PART2',
  overallBand: 6.0,
  outOfCalibrationRange: false,
  summary: 'Bài nói trôi chảy ở mức khá.',
  improvements: ['Luyện kể chuyện trong quá khứ bằng thì quá khứ đơn'],
  transcript,
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
  criteria: [
    {
      id: 'CRIT_S_FC',
      band: 6,
      comment: 'Người nói trả lời liền mạch.',
      evidence: [
        {
          quote: 'Um, I want to talk',
          errorType: 'ERR_LONG_PAUSE',
          suggestion: 'Chuẩn bị sẵn câu mở đầu.',
        },
      ],
    },
    { id: 'CRIT_S_LR', band: 6, comment: 'Vốn từ đủ dùng.', evidence: [] },
    { id: 'CRIT_S_GRA', band: 5, comment: 'Còn lỗi thì quá khứ.', evidence: [] },
    { id: 'CRIT_S_P', band: 6, comment: 'Phát âm dễ hiểu.', evidence: [] },
  ],
}

const sub: SubmissionDetail = {
  id: 'sub-spk-1',
  exerciseId: 'ex-i-speaking-01',
  exerciseTitle: 'Speaking Part 2 - Describe a city you visited',
  skillType: 'SPEAKING',
  exerciseType: 'PRACTICE',
  courseId: 'c-intensive',
  sectionId: 's-i4',
  attemptNumber: 1,
  status: 'GRADED',
  score: 6.0,
  maxScore: 9,
  correctCount: 0,
  questionCount: 1,
  timeSpent: 38,
  submittedAt: '2026-10-20T10:00:00',
  answers: {},
  results: [],
  exercise: exercises.find((e) => e.id === 'ex-i-speaking-01')!,
  transcript,
  speakingFeedback: feedback,
}

// The recommendations panel has its own tests (RecommendedPractice.test.tsx).
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: { kgRecommendations: vi.fn(() => new Promise(() => {})) },
}))

const renderPage = (value: SubmissionDetail) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <SpeakingResultPage sub={value} />
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => useSpeakingResultsStore.setState({ results: {} }))

describe('SpeakingResultPage', () => {
  it('shows overall band, summary, part badge, and AI disclaimer', () => {
    renderPage(sub)
    expect(screen.getByLabelText('Band tổng 6.0')).toBeInTheDocument()
    expect(screen.getByText('Bài nói trôi chảy ở mức khá.')).toBeInTheDocument()
    expect(screen.getByText('Speaking Part 2')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('không phải điểm thi chính thức')
  })

  it('displays speech features and pronunciation scores', () => {
    renderPage(sub)
    expect(screen.getByText('123.4 WPM')).toBeInTheDocument()
    expect(screen.getByText('78.5 / 100')).toBeInTheDocument()
    expect(screen.getByText('68.0 / 100')).toBeInTheDocument()
  })

  it('renders safely when pronunciation is null or prosody is null', () => {
    const noPronSub: SubmissionDetail = {
      ...sub,
      speakingFeedback: { ...feedback, pronunciation: null },
    }
    const { unmount } = renderPage(noPronSub)
    expect(screen.queryByLabelText('Đánh giá phát âm')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Chỉ số giọng nói')).toBeInTheDocument()
    unmount()

    const noProsodySub: SubmissionDetail = {
      ...sub,
      speakingFeedback: {
        ...feedback,
        pronunciation: { ...feedback.pronunciation!, prosody: null },
      },
    }
    renderPage(noProsodySub)
    expect(screen.getByLabelText('Đánh giá phát âm')).toBeInTheDocument()
    expect(screen.queryByText(/Ngữ điệu \(Prosody\)/)).not.toBeInTheDocument()
  })

  it('renders 4 speaking criteria cards and highlights quotes in transcript', () => {
    renderPage(sub)
    const cards = screen.getAllByRole('article')
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Fluency & Coherence',
      'Lexical Resource',
      'Grammatical Range & Accuracy',
      'Pronunciation',
    ])
    const fc = within(cards[0])
    expect(fc.getByText('Band 6.0')).toBeInTheDocument()
    expect(fc.getByText('Ngập ngừng / ngừng lâu')).toBeInTheDocument()

    const mark = screen.getByTitle('Ngập ngừng / ngừng lâu')
    expect(mark.tagName).toBe('MARK')
    expect(mark).toHaveTextContent('Um, I want to talk')
  })
})
