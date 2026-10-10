import { expect, test, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@ielts.dev')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page.getByRole('heading', { name: /Xin chào/ })).toBeVisible()
}

/** Value of the "Số câu đúng" metric on the result page. */
const correctCount = (page: Page) =>
  page.getByText('Số câu đúng').locator('xpath=following-sibling::p[1]')

test.beforeEach(async ({ page }) => {
  // Start every test from fresh mock data and an empty session.
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
})

test('redirects guests to the login page', async ({ page }) => {
  await page.goto('/courses')
  await expect(page).toHaveURL(/\/login$/)
})

test('reading practice: course → exercise → submit → result → review', async ({ page }) => {
  await login(page)

  await page.getByRole('link', { name: 'Khóa học', exact: true }).click()
  await page.getByRole('link', { name: /IELTS Foundation 5.0/ }).click()
  await page.getByRole('link', { name: /Vào học/ }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  await page.getByRole('link', { name: 'Bài luyện' }).click()
  await page.getByRole('link', { name: /Reading Passage - The Story of the Pencil/ }).click()

  // Questions 1-4: matching headings (droplist)
  await expect(page.getByText('The Story of the Pencil').first()).toBeVisible()
  await page
    .getByRole('combobox', { name: 'Câu 1' })
    .selectOption({ label: 'ii. The problems with early writing tools' })
  await page
    .getByRole('combobox', { name: 'Câu 2' })
    .selectOption({ label: 'iii. A local discovery with wider uses' })
  await expect(page.getByText('Đã làm 2 / 8')).toBeVisible()

  // Answers survive a reload.
  await page.reload()
  await expect(page.getByText('Đã làm 2 / 8')).toBeVisible()

  // Jump to the last group with the navigator and answer it.
  await page.getByRole('button', { name: /^Câu 6/ }).click()
  await page
    .getByRole('radiogroup', { name: 'Câu 6' })
    .getByRole('radio', { name: /^A\s*TRUE$/ })
    .click()

  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page.getByRole('dialog', { name: 'Nộp bài?' })).toContainText(
    'Còn 5 câu chưa trả lời',
  )
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()

  await expect(page).toHaveURL(/\/submissions\/sub-/)
  await expect(correctCount(page)).toHaveText('3/8')
  // Practice is never converted to a band (backend rule).
  await expect(page.getByText(/band/i)).toHaveCount(0)

  await page.getByRole('link', { name: /Xem lại chi tiết/ }).click()
  await expect(page.getByText(/Câu 1: Đúng/)).toBeVisible()
})

test('listening practice shows audio controls and hides the transcript until review', async ({
  page,
}) => {
  await login(page)
  await page.goto('/run/ex-listening-library')
  await expect(page.getByRole('heading', { name: 'Section 2' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Phát' })).toBeVisible()
  await expect(page.getByText('Transcript', { exact: true })).toHaveCount(0)

  await page.getByRole('textbox', { name: 'Câu 2' }).fill('twelve')
  await page.getByRole('button', { name: /5-7/ }).click()
  await page.getByRole('button', { name: 'Câu 5: D' }).click()
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(correctCount(page)).toHaveText('2/7')

  await page.getByRole('link', { name: /Xem lại chi tiết/ }).click()
  await expect(page.getByText('Transcript', { exact: true })).toBeVisible()
})

test('quiz checks each answer and records the attempt', async ({ page }) => {
  await login(page)
  await page.goto('/run/ex-quiz-tfng')
  await expect(page.getByRole('heading', { name: 'Chọn TRUE, FALSE hoặc NOT GIVEN' })).toBeVisible()

  const answers = ['FALSE', 'TRUE', 'NOT GIVEN', 'TRUE']
  for (const [i, answer] of answers.entries()) {
    await page.getByRole('radio', { name: new RegExp(`^[A-C]\\s*${answer}$`) }).click()
    await page.getByRole('button', { name: 'Kiểm tra' }).click()
    await expect(page.getByText(i < 3 ? 'Chính xác!' : 'Chưa chính xác')).toBeVisible()
    if (i < answers.length - 1) await page.getByRole('button', { name: 'Tiếp tục' }).click()
  }
  await page.getByRole('button', { name: 'Hoàn thành' }).click()
  await expect(correctCount(page)).toHaveText('3/4')

  await page.goto('/history')
  await expect(
    page.getByRole('link', { name: 'Làm quen True / False / Not Given' }).first(),
  ).toBeVisible()
})
