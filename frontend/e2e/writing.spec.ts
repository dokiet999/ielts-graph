import { expect, test, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@ielts.dev')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page.getByRole('heading', { name: /Xin chào/ })).toBeVisible()
}

const sentence = 'Online learning gives many students a lot of freedom to study at home. '
const essay = (sentences: number) => sentence.repeat(sentences).trim()

async function openWritingExercise(page: Page) {
  await page.getByRole('link', { name: 'Khóa học', exact: true }).click()
  await page.getByRole('link', { name: /IELTS Intensive 6.5/ }).click()
  await page.getByRole('link', { name: /Writing Task 2/ }).click()
  await page.getByRole('link', { name: 'Bài luyện', exact: true }).click()
  await page.getByRole('link', { name: /Technology and Education/ }).click()
}

test.beforeEach(async ({ page }) => {
  // Start every test from fresh mock data and an empty session.
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
})

test('writing practice: write → submit → band per criterion → history', async ({ page }) => {
  await login(page)
  await openWritingExercise(page)

  const editor = page.getByRole('textbox', { name: 'Bài viết của bạn' })
  await expect(page.getByText(/online learning is more effective/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nộp bài' })).toBeDisabled()

  // The draft and the word count survive a reload.
  await editor.fill(essay(5))
  await expect(page.getByText(/65 \/ 250 từ/)).toBeVisible()
  await page.reload()
  await expect(editor).toHaveValue(essay(5))
  await expect(page.getByRole('button', { name: 'Nộp bài' })).toBeEnabled()

  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page.getByRole('dialog', { name: 'Nộp bài?' })).toContainText('chưa đạt 250 từ')
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page.getByText('AI đang chấm bài của bạn...')).toBeVisible()

  // Result: overall band, one card per criterion, evidence, disclaimer.
  await expect(page).toHaveURL(/\/submissions\/sub-/)
  await expect(page.getByLabel(/^Band tổng/)).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(4)
  await expect(page.getByRole('article', { name: 'Task Response' })).toContainText('Band')
  await expect(page.getByRole('note')).toContainText('không phải điểm thi chính thức')
  await expect(page.locator('mark').first()).toBeVisible()

  // The result survives a reload (the detail carries the structured feedback, like the backend).
  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(4)

  await page.getByRole('main').getByRole('link', { name: 'Lịch sử làm bài' }).click()
  await expect(page.getByText(/Band \d\.\d/).first()).toBeVisible()
})

test('writing practice: an unavailable AI keeps the essay and can be retried', async ({ page }) => {
  await login(page)
  await openWritingExercise(page)

  const editor = page.getByRole('textbox', { name: 'Bài viết của bạn' })
  await editor.fill(`${essay(5)} [503]`)
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('quá tải')
  await expect(alert.getByRole('button', { name: 'Thử lại' })).toBeVisible()
  await expect(editor).toHaveValue(`${essay(5)} [503]`)

  // Without the failure marker the retry goes through.
  await editor.fill(essay(5))
  await alert.getByRole('button', { name: 'Thử lại' }).click()
  await expect(page).toHaveURL(/\/submissions\/sub-/)
})
