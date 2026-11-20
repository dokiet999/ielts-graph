import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Category } from '@/lib/types'
import { AdminCategoriesPage } from './AdminCategoriesPage'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      adminCategories: vi.fn(),
      adminCreateCategory: vi.fn(),
      adminUpdateCategory: vi.fn(),
      adminDeleteCategory: vi.fn(),
    },
  }
})

const usedCategory: Category = {
  id: 'cat-academic',
  name: 'Academic',
  slug: 'academic',
  description: 'IELTS Academic',
  iconUrl: null,
  isActive: true,
  ordering: 1,
  courseCount: 3,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
}

const emptyCategory: Category = {
  id: 'cat-empty',
  name: 'IELTS Intensive',
  slug: 'ielts-intensive',
  description: null,
  iconUrl: null,
  isActive: true,
  ordering: 2,
  courseCount: 0,
  createdAt: '2026-10-02T08:00:00Z',
  updatedAt: '2026-10-02T08:00:00Z',
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AdminCategoriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminCategoriesPage', () => {
  beforeEach(() => {
    vi.mocked(api.adminCategories).mockReset()
    vi.mocked(api.adminCreateCategory).mockReset()
    vi.mocked(api.adminUpdateCategory).mockReset()
    vi.mocked(api.adminDeleteCategory).mockReset()

    vi.mocked(api.adminCategories).mockResolvedValue({
      items: [usedCategory, emptyCategory],
      page: 1,
      size: 10,
      total: 2,
      totalPages: 1,
    })
  })

  it('lists categories and creates a category with optional slug', async () => {
    vi.mocked(api.adminCreateCategory).mockResolvedValue({
      ...emptyCategory,
      id: 'cat-new',
      name: 'Luyện Đề Nâng Cao',
      slug: 'luyen-de-nang-cao',
    })

    renderPage()

    expect(await screen.findByText('Academic')).toBeInTheDocument()
    expect(screen.getByText('3 khóa học')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Thêm danh mục/ }))
    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Tên danh mục'), 'Luyện Đề Nâng Cao')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tạo danh mục' }))

    expect(api.adminCreateCategory).toHaveBeenCalledWith({
      name: 'Luyện Đề Nâng Cao',
      slug: undefined,
      description: undefined,
      iconUrl: undefined,
      ordering: 0,
      isActive: true,
    })
  })

  it('edits, toggles visibility, and handles delete including 409 conflict', async () => {
    vi.mocked(api.adminUpdateCategory).mockResolvedValue({ ...emptyCategory, isActive: false })
    vi.mocked(api.adminDeleteCategory)
      .mockRejectedValueOnce(
        Object.assign(new Error('Conflict'), {
          isAxiosError: true,
          response: {
            status: 409,
            data: { code: 'CATEGORY_IN_USE', message: 'Không thể xóa danh mục đang có khóa học.' },
          },
        }),
      )
      .mockResolvedValueOnce(null)

    renderPage()
    await screen.findByText('Academic')

    // Quick toggle hide on first category
    const hideButtons = screen.getAllByRole('button', { name: 'Ẩn' })
    await userEvent.click(hideButtons[0])
    expect(api.adminUpdateCategory).toHaveBeenCalledWith('cat-academic', {
      name: 'Academic',
      slug: 'academic',
      description: 'IELTS Academic',
      iconUrl: undefined,
      ordering: 1,
      isActive: false,
    })

    // Delete in-use category -> shows 409 error in confirm dialog
    const deleteButtons = screen.getAllByRole('button', { name: 'Xóa' })
    await userEvent.click(deleteButtons[0])
    const confirmDialog1 = screen.getByRole('dialog')
    await userEvent.click(within(confirmDialog1).getByRole('button', { name: 'Xóa danh mục' }))
    expect(await within(confirmDialog1).findByText('Không thể xóa danh mục đang có khóa học.')).toBeInTheDocument()
    await userEvent.click(within(confirmDialog1).getByRole('button', { name: 'Hủy' }))

    // Delete unused second category -> succeeds
    await userEvent.click(deleteButtons[1])
    const confirmDialog2 = screen.getByRole('dialog')
    await userEvent.click(within(confirmDialog2).getByRole('button', { name: 'Xóa danh mục' }))
    expect(api.adminDeleteCategory).toHaveBeenCalledWith('cat-empty')
  })
})
