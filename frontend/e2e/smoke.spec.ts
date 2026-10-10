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
  // Pick the Reading stage explicitly: "Vào học" opens the first unfinished stage.
  await page.getByRole('link', { name: /Reading nền tảng/ }).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()

  await page.getByRole('link', { name: 'Bài luyện', exact: true }).click()
  await page.getByRole('link', { name: /Farming in the Sky/ }).click()

  // Question 1 (true/false) and question 6 (fill in the blank).
  await expect(page.getByText('Farming in the Sky').first()).toBeVisible()
  await page
    .getByRole('radiogroup', { name: 'Câu 1' })
    .getByRole('radio', { name: /^A\s*TRUE$/ })
    .click()
  await page.getByRole('button', { name: /^Câu 6/ }).click()
  await page.getByRole('textbox', { name: 'Câu 6' }).fill('sponge')
  await expect(page.getByText('Đã làm 2 / 13')).toBeVisible()

  // Answers survive a reload.
  await page.reload()
  await expect(page.getByText('Đã làm 2 / 13')).toBeVisible()

  // The submit button is on the last group.
  await page.getByRole('button', { name: /^Câu 13/ }).click()
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page.getByRole('dialog', { name: 'Nộp bài?' })).toContainText(
    'Còn 11 câu chưa trả lời',
  )
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()

  await expect(page).toHaveURL(/\/submissions\/sub-/)
  await expect(correctCount(page)).toHaveText('2/13')
  // Practice is never converted to a band (backend rule).
  await expect(page.getByText(/band/i)).toHaveCount(0)

  await page.getByRole('link', { name: /Xem lại chi tiết/ }).click()
  await expect(page.getByText(/Câu 1: Đúng/)).toBeVisible()
})

test('listening practice shows audio controls and hides the transcript until review', async ({
  page,
}) => {
  await login(page)
  await page.goto('/run/ex-listening-01')
  await expect(page.getByRole('heading', { name: 'Section 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Phát' })).toBeVisible()
  await expect(page.getByText('Transcript', { exact: true })).toHaveCount(0)

  await page.getByRole('textbox', { name: 'Câu 1' }).fill('Thornley')
  await page.getByRole('textbox', { name: 'Câu 2' }).fill('493 826')
  await page.getByRole('button', { name: /^Câu 10/ }).click()
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(correctCount(page)).toHaveText('2/10')

  await page.getByRole('link', { name: /Xem lại chi tiết/ }).click()
  await expect(page.getByText('Transcript', { exact: true })).toBeVisible()
})

test('quiz checks each answer and keeps progress after a reload', async ({ page }) => {
  await login(page)
  await page.goto('/run/ex-st-quiz-reading-01')
  await expect(page.getByText(/^Câu 1\/13/)).toBeVisible()

  // Question 1 is TRUE (correct); question 2 is FALSE, so answering TRUE is wrong.
  await page.getByRole('radio', { name: /^A\s*TRUE$/ }).click()
  await page.getByRole('button', { name: 'Kiểm tra' }).click()
  await expect(page.getByText('Chính xác!')).toBeVisible()
  await page.getByRole('button', { name: 'Tiếp tục' }).click()

  await page.getByRole('radio', { name: /^A\s*TRUE$/ }).click()
  await page.getByRole('button', { name: 'Kiểm tra' }).click()
  await expect(page.getByText('Chưa chính xác')).toBeVisible()
  await expect(page.getByText(/Đáp án đúng:/)).toContainText('FALSE')
  await page.getByRole('button', { name: 'Tiếp tục' }).click()

  await page.reload()
  await expect(page.getByText(/^Câu 3\/13/)).toBeVisible()
})
