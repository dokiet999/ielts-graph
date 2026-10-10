import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { exercises } from '@/mocks/fixtures/courses'
import type { Answers, QuestionGroup, QuestionResult } from '@/lib/types'
import { QuestionGroupView } from './registry'

const reading01 = exercises.find((e) => e.id === 'ex-reading-01')!
const option = (qid: string, i: number, text: string) => ({
  id: `${qid}-o${i}`,
  optionText: text,
  ordering: i,
})

// The sample data has no DROPLIST or "choose TWO" questions, so these two groups are built inline.
const droplistGroup: QuestionGroup = {
  id: 'g-drop',
  groupTitle: 'Questions 1-2',
  groupInstruction: 'Choose the correct heading for each paragraph.',
  questionType: 'DROPLIST',
  questionRange: '1-2',
  questions: [1, 2].map((n) => ({
    id: `d${n}`,
    number: n,
    questionText: `Paragraph ${n === 1 ? 'A' : 'B'}`,
    questionType: 'DROPLIST' as const,
    points: 1,
    options: [option(`d${n}`, 1, 'i. First heading'), option(`d${n}`, 2, 'ii. Second heading')],
  })),
}

const chooseTwoGroup: QuestionGroup = {
  id: 'g-two',
  groupTitle: 'Question 5',
  groupInstruction: 'Choose TWO letters, A-E.',
  questionType: 'MULTIPLE_CHOICE',
  questionRange: '5',
  questions: [
    {
      id: 'm1',
      number: 5,
      questionText: 'Which TWO statements are mentioned?',
      questionType: 'MULTIPLE_CHOICE',
      points: 1,
      options: ['A. one', 'B. two', 'C. three', 'D. four', 'E. five'].map((t, i) =>
        option('m1', i + 1, t),
      ),
    },
  ],
}

const groupOf = (ex: typeof reading01, type: QuestionGroup['questionType']) =>
  ex.questionGroups.find((g) => g.questionType === type)!

function Harness({
  group,
  results,
}: {
  group: QuestionGroup
  results?: Record<string, QuestionResult>
}) {
  const [answers, setAnswers] = useState<Answers>({})
  return (
    <>
      <QuestionGroupView
        group={group}
        answers={answers}
        onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
        results={results}
      />
      <output data-testid="answers">{JSON.stringify(answers)}</output>
    </>
  )
}

const answers = () => JSON.parse(screen.getByTestId('answers').textContent!)

describe('QuestionGroupView', () => {
  it('renders TRUE/FALSE/NOT GIVEN as a single-choice group', async () => {
    const group = groupOf(reading01, 'TRUE_FALSE')
    render(<Harness group={group} />)
    const first = screen.getByRole('radiogroup', { name: 'Câu 1' })
    await userEvent.click(within(first).getByRole('radio', { name: /FALSE/ }))
    expect(answers()[group.questions[0].id]).toEqual([`${group.questions[0].id}-o2`])
  })

  it('renders fill-in-the-blank inputs inside the sentence', async () => {
    const group = groupOf(reading01, 'FILL_BLANK')
    render(<Harness group={group} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Câu 6' }), 'sponge')
    expect(answers()[group.questions[0].id]).toBe('sponge')
  })

  it('limits "choose TWO" questions to two selections', async () => {
    const group = chooseTwoGroup
    render(<Harness group={group} />)
    const boxes = screen.getAllByRole('checkbox')
    await userEvent.click(boxes[0])
    await userEvent.click(boxes[1])
    await userEvent.click(boxes[2])
    const qid = group.questions[0].id
    expect(answers()[qid]).toEqual([`${qid}-o2`, `${qid}-o3`])
  })

  it('renders matching questions as a grid', async () => {
    const group = groupOf(reading01, 'MATCHING')
    render(<Harness group={group} />)
    await userEvent.click(screen.getByRole('button', { name: 'Câu 12: C' }))
    expect(answers()[group.questions[0].id]).toEqual([`${group.questions[0].id}-o3`])
  })

  it('renders droplist questions as selects', async () => {
    const group = droplistGroup
    render(<Harness group={group} />)
    const select = screen.getByRole('combobox', { name: 'Câu 1' })
    await userEvent.selectOptions(select, `${group.questions[0].id}-o2`)
    expect(answers()[group.questions[0].id]).toEqual([`${group.questions[0].id}-o2`])
  })

  it('shows correct answers and explanations in review mode', () => {
    const group = groupOf(reading01, 'TRUE_FALSE')
    const results = Object.fromEntries(
      group.questions.map((q) => [q.id, { questionId: q.id, correct: false, earned: 0 }]),
    )
    render(<Harness group={group} results={results} />)
    expect(screen.getAllByText(/Đáp án:/)).toHaveLength(group.questions.length)
    expect(screen.getByText(group.questions[0].explanation!)).toBeInTheDocument()
    expect(screen.getAllByRole('radio')[0]).toBeDisabled()
  })
})
