import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { api } from '@/lib/api'
import { personalizationFixture } from '@/mocks/fixtures/personalization'
import { PersonalizationPage } from './PersonalizationPage'

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  api: { personalization: vi.fn(), setTargetBand: vi.fn() },
}))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PersonalizationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PersonalizationPage', () => {
  beforeEach(() => {
    vi.mocked(api.personalization).mockResolvedValue(personalizationFixture({}))
    vi.mocked(api.setTargetBand).mockResolvedValue(personalizationFixture({ WRITING: 7 }))
  })

  it('lists the active errors first with their Knowledge Graph path and practice links', async () => {
    renderPage()

    const card = await screen.findByRole('listitem', { name: 'Kết hợp từ không tự nhiên' })
    expect(within(card).getByText('Đang yếu')).toBeInTheDocument()
    const path = within(card).getByLabelText('Đường đi trong Knowledge Graph')
    expect(path).toHaveTextContent('Kết hợp từ không tự nhiên')
    expect(path).toHaveTextContent('Lexical Resource')
    expect(
      within(card).getByRole('link', { name: 'Luyện ngay: Bài tập kết hợp từ (collocation)' }),
    ).toHaveAttribute('href', '/run/60000000-0000-0000-0000-000000000008')

    // A weak prerequisite is suggested first
    const sentence = screen.getByRole('listitem', { name: 'Lỗi cấu trúc câu phức' })
    expect(sentence).toHaveTextContent('Nên củng cố Thì động từ trước')

    // Resolved errors are in their own section
    expect(screen.getByRole('heading', { name: /Đã khắc phục/ })).toBeInTheDocument()
  })

  it('asks for a target band, then shows the criteria below it', async () => {
    renderPage()
    expect(await screen.findByText(/Chọn band mục tiêu/)).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Band mục tiêu'), '7')

    expect(api.setTargetBand).toHaveBeenCalledWith('WRITING', 7)
    expect(
      await screen.findByRole('heading', { name: /Tiêu chí chưa đạt mục tiêu/ }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/mục tiêu 7.0/).length).toBeGreaterThan(0)
  })

  it('switches to Speaking, where an error without a drill says so', async () => {
    renderPage()
    await screen.findByRole('listitem', { name: 'Kết hợp từ không tự nhiên' })

    await userEvent.click(screen.getByRole('tab', { name: 'Speaking' }))

    const card = screen.getByRole('listitem', { name: 'Ngập ngừng kéo dài' })
    expect(card).toHaveTextContent('Chưa có bài luyện cho lỗi này')
  })
})
