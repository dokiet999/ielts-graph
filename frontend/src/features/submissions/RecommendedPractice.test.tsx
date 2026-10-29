import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError } from 'axios'
import { api } from '@/lib/api'
import type { KgRecommendations } from '@/lib/types'
import { RecommendedPractice } from './RecommendedPractice'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: { kgRecommendations: vi.fn() },
}))

const response: KgRecommendations = {
  skill: 'SKILL_W',
  bandRequested: 6,
  bandApplied: 6,
  recommendations: [
    {
      resourceId: 'RES_W_ARTICLE_01',
      nameVi: 'Bài tập mạo từ cơ bản',
      nameEn: 'Basic articles exercise',
      type: 'exercise',
      sqlRef: 'exercises:60000000-0000-0000-0000-000000000001',
      bandMatch: 'nearest',
      path: {
        errorType: { id: 'ERR_ARTICLE', nameVi: 'Lỗi mạo từ', nameEn: 'Article error' },
        subSkill: { id: 'SUB_ARTICLE', nameVi: 'Mạo từ', nameEn: 'Articles' },
        criterion: {
          id: 'CRIT_W_GRA',
          nameVi: 'Phạm vi và độ chính xác ngữ pháp',
          nameEn: 'Grammatical Range & Accuracy',
        },
      },
    },
  ],
  unmatchedErrors: ['ERR_SENT_STRUCTURE'],
}

const criteria = [
  {
    evidence: [
      { errorType: 'ERR_ARTICLE' },
      { errorType: 'ERR_SENT_STRUCTURE' },
      { errorType: 'ERR_ARTICLE' },
    ],
  },
]

function renderPanel(props: Partial<Parameters<typeof RecommendedPractice>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RecommendedPractice skill="SKILL_W" criteria={criteria} overallBand={6.5} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => vi.mocked(api.kgRecommendations).mockReset())

describe('RecommendedPractice', () => {
  it('asks the KG for the distinct errors and the integer band', async () => {
    vi.mocked(api.kgRecommendations).mockResolvedValue(response)
    renderPanel()
    await screen.findByText('Bài tập mạo từ cơ bản')
    expect(api.kgRecommendations).toHaveBeenCalledWith({
      skill: 'SKILL_W',
      errors: ['ERR_ARTICLE', 'ERR_SENT_STRUCTURE'],
      band: 6,
    })
  })

  it('shows each exercise under its error, why it fits, and a link to the runner', async () => {
    vi.mocked(api.kgRecommendations).mockResolvedValue(response)
    renderPanel()
    const list = await screen.findByRole('list', { name: 'Bài luyện cho lỗi Mạo từ' })
    const card = within(list).getByRole('listitem', { name: 'Bài tập mạo từ cơ bản' })
    expect(card).toHaveTextContent('Luyện kỹ năng Mạo từ · tiêu chí Grammatical Range & Accuracy')
    expect(card).toHaveTextContent('Gần band của bạn')
    expect(within(card).getByRole('link', { name: /Luyện ngay/ })).toHaveAttribute(
      'href',
      '/run/60000000-0000-0000-0000-000000000001',
    )
    expect(screen.getByText('Chưa có bài luyện cho: Cấu trúc câu.')).toBeInTheDocument()
  })

  it('keeps the page usable when the KG is down, and can try again', async () => {
    vi.mocked(api.kgRecommendations).mockRejectedValueOnce(
      new AxiosError('down', 'ERR_BAD_RESPONSE', undefined, undefined, {
        status: 503,
        data: { code: 'KG_UNAVAILABLE' },
      } as never),
    )
    renderPanel()
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('tạm thời không khả dụng')

    vi.mocked(api.kgRecommendations).mockResolvedValue(response)
    await userEvent.click(within(status).getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Bài tập mạo từ cơ bản')).toBeInTheDocument()
  })

  it('lists the errors when no exercise matches any of them', async () => {
    vi.mocked(api.kgRecommendations).mockResolvedValue({
      ...response,
      recommendations: [],
      unmatchedErrors: ['ERR_ARTICLE', 'ERR_SENT_STRUCTURE'],
    })
    renderPanel()
    expect(
      await screen.findByText('Hiện chưa có bài luyện cho các lỗi: Mạo từ, Cấu trúc câu.'),
    ).toBeInTheDocument()
  })

  it('does not call the KG without errors or without the structured feedback', () => {
    renderPanel({ criteria: [{ evidence: [] }] })
    expect(screen.getByText(/AI không ghi nhận lỗi cụ thể/)).toBeInTheDocument()
    renderPanel({ criteria: null })
    expect(screen.getByText(/không còn danh sách lỗi/)).toBeInTheDocument()
    expect(api.kgRecommendations).not.toHaveBeenCalled()
  })

  it('uses the Speaking error names for Speaking', async () => {
    vi.mocked(api.kgRecommendations).mockResolvedValue({
      ...response,
      skill: 'SKILL_S',
      recommendations: [],
      unmatchedErrors: ['ERR_LONG_PAUSE'],
    })
    renderPanel({ skill: 'SKILL_S', criteria: [{ evidence: [{ errorType: 'ERR_LONG_PAUSE' }] }] })
    expect(
      await screen.findByText('Hiện chưa có bài luyện cho các lỗi: Ngập ngừng / ngừng lâu.'),
    ).toBeInTheDocument()
  })
})
