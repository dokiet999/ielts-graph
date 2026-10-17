import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { SubmissionDetail, WritingFeedback } from '@/lib/types'
import { exercises } from '@/mocks/fixtures/courses'
import { useWritingResultsStore } from '@/stores/writingResults'
import { WritingResultPage } from './WritingResultPage'

const essay = 'I think that a technology is useful.\nMoreover, it is fast and cheap.'

const feedback: WritingFeedback = {
  taskType: 'QT_W2_DISCUSSION',
  overallBand: 6.5,
  outOfCalibrationRange: false,
  summary: 'Bài viết có bố cục rõ ràng.',
  improvements: ['Thêm ví dụ cụ thể.'],
  criteria: [
    {
      id: 'CRIT_W_TR',
      band: 7,
      comment: 'Trả lời đủ các phần của đề.',
      evidence: [{ quote: 'a technology', errorType: 'ERR_ARTICLE', suggestion: 'Bỏ mạo từ a.' }],
    },
    { id: 'CRIT_W_CC', band: 6, comment: 'Có chia đoạn.', evidence: [] },
    { id: 'CRIT_W_LR', band: 5, comment: 'Vốn từ vừa đủ.', evidence: [] },
    { id: 'CRIT_W_GRA', band: 6, comment: 'Còn lỗi mạo từ.', evidence: [] },
  ],
}

const sub: SubmissionDetail = {
  id: 'sub-1',
  exerciseId: 'ex-i-writing-01',
  exerciseTitle: 'IELTS Writing Task 2 - Technology and Education',
  skillType: 'WRITING',
  exerciseType: 'PRACTICE',
  courseId: 'c-intensive',
  sectionId: 's-i3',
  attemptNumber: 2,
  status: 'GRADED',
  score: 6.5,
  maxScore: 9,
  correctCount: 0,
  questionCount: 1,
  timeSpent: 900,
  submittedAt: '2026-10-16T10:00:00',
  answers: {},
  results: [],
  exercise: exercises.find((e) => e.id === 'ex-i-writing-01')!,
  essayText: essay,
  writingFeedback: feedback,
}

const renderPage = (value: SubmissionDetail) =>
  render(
    <MemoryRouter>
      <WritingResultPage sub={value} />
    </MemoryRouter>,
  )

beforeEach(() => useWritingResultsStore.setState({ results: {} }))

describe('WritingResultPage', () => {
  it('shows the overall band and the summary', () => {
    renderPage(sub)
    expect(screen.getByLabelText('Band tổng 6.5')).toBeInTheDocument()
    expect(screen.getByText('Bài viết có bố cục rõ ràng.')).toBeInTheDocument()
    expect(screen.getByText('Lần làm thứ 2')).toBeInTheDocument()
  })

  it('shows the practice-only disclaimer on the result (FR-3.03)', () => {
    renderPage(sub)
    expect(screen.getByRole('note')).toHaveTextContent('không phải điểm thi chính thức')
  })

  it('shows a card per criterion with band, comment and evidence', () => {
    renderPage(sub)
    const cards = screen.getAllByRole('article')
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Task Response',
      'Coherence & Cohesion',
      'Lexical Resource',
      'Grammatical Range & Accuracy',
    ])
    const tr = within(cards[0])
    expect(tr.getByText('Band 7.0')).toBeInTheDocument()
    expect(tr.getByText('Trả lời đủ các phần của đề.')).toBeInTheDocument()
    expect(tr.getByText('Mạo từ')).toBeInTheDocument()
    expect(tr.getByText('ERR_ARTICLE')).toBeInTheDocument()
    expect(tr.getByText('“a technology”')).toBeInTheDocument()
    expect(tr.getByText('Bỏ mạo từ a.')).toBeInTheDocument()
  })

  it('highlights the quotes inside the essay', () => {
    renderPage(sub)
    const mark = screen.getByTitle('Mạo từ')
    expect(mark.tagName).toBe('MARK')
    expect(mark).toHaveTextContent('a technology')
  })

  it('lists what to improve', () => {
    renderPage(sub)
    expect(screen.getByText('Thêm ví dụ cụ thể.')).toBeInTheDocument()
  })

  it('warns when the band is outside the calibrated range', () => {
    renderPage({ ...sub, writingFeedback: { ...feedback, outOfCalibrationRange: true } })
    expect(screen.getByText(/ngoài vùng 4–8/)).toBeInTheDocument()
  })

  it('uses the feedback kept after grading when the backend did not return it', () => {
    useWritingResultsStore.getState().save('sub-1', feedback)
    renderPage({ ...sub, writingFeedback: null })
    expect(screen.getAllByRole('article')).toHaveLength(4)
  })

  it('still shows the band and the essay when no feedback is available', () => {
    renderPage({ ...sub, writingFeedback: null })
    expect(screen.getByLabelText('Band tổng 6.5')).toBeInTheDocument()
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    expect(screen.getByText(/chỉ xem được ngay sau khi chấm bài/)).toBeInTheDocument()
    expect(screen.getByText(/I think that a technology is useful/)).toBeInTheDocument()
    expect(screen.getByRole('note')).toBeInTheDocument()
  })
})
