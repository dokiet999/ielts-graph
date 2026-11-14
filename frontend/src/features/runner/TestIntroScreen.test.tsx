import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Exercise } from '@/lib/types'
import { ExitConfirmDialog } from './ExitConfirmDialog'
import { TestIntroScreen } from './TestIntroScreen'

const sampleReadingExercise: Exercise = {
  id: 'ex-mock-r1',
  lessonId: 'l1',
  sectionId: 's1',
  courseId: 'c1',
  title: 'Alexander Henderson (1831-1913)',
  instruction: null,
  audioUrl: null,
  content: {
    passageTitle: 'Alexander Henderson (1831-1913)',
    paragraphs: [{ label: 'A', text: 'Sample paragraph' }],
  },
  exerciseType: 'MOCK_TEST',
  skillType: 'READING',
  timeLimit: 1200,
  maxAttempts: 10,
  questionGroups: [
    {
      id: 'g1',
      groupTitle: 'Questions 1-5',
      groupInstruction: 'TRUE / FALSE / NOT GIVEN',
      questionType: 'TRUE_FALSE',
      questionRange: '1-5',
      questions: [],
    },
    {
      id: 'g2',
      groupTitle: 'Questions 6-13',
      groupInstruction: 'Complete the notes below',
      questionType: 'FILL_BLANK',
      questionRange: '6-13',
      questions: [],
    },
  ],
}

describe('TestIntroScreen', () => {
  it('shows title, metadata, instructions, test info, and triggers onStart when clicking Bắt đầu', async () => {
    const onStart = vi.fn()
    const onExit = vi.fn()

    render(
      <TestIntroScreen
        exercise={sampleReadingExercise}
        totalQuestions={13}
        onStart={onStart}
        onExit={onExit}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /Alexander Henderson \(1831-1913\)/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('13 câu hỏi')).toBeInTheDocument()
    expect(screen.getByText('1 đoạn văn')).toBeInTheDocument()
    expect(screen.getByText('20 phút')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Hướng dẫn làm bài' })).toBeInTheDocument()
    expect(
      screen.getByText(
        /Bạn sẽ đọc đoạn văn và trả lời câu hỏi, có thể di chuyển qua lại giữa các câu hỏi/,
      ),
    ).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Thông tin bài test' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Bài test này bao gồm 13 câu hỏi thuộc 1 đoạn văn, thời gian làm bài là 20 phút.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Các dạng câu hỏi có trong bài test: True / False / Not given, Summary, Note Completion',
      ),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Bắt đầu/ }))
    expect(onStart).toHaveBeenCalledOnce()
  })
})

describe('ExitConfirmDialog', () => {
  it('renders title, description, Ở lại and Thoát buttons and calls callbacks', async () => {
    const onOpenChange = vi.fn()
    const onConfirmExit = vi.fn()

    render(
      <ExitConfirmDialog open={true} onOpenChange={onOpenChange} onConfirmExit={onConfirmExit} />,
    )

    expect(screen.getByRole('heading', { name: 'Thoát và lưu lại bài' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Bài làm của bạn sẽ được lưu lại và có thể làm tiếp vào lần sau. Bạn có chắc muốn thoát không?',
      ),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ở lại' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    await userEvent.click(screen.getByRole('button', { name: 'Thoát' }))
    expect(onConfirmExit).toHaveBeenCalledOnce()
  })
})

