import { expect, test, type Page } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@ielts.dev')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page.getByRole('heading', { name: /Xin chào/ })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
})

test('final test flow: intro screen → start → exit & save → continue → submit → result card & history', async ({
  page,
}) => {
  await login(page)

  // Open Foundation course -> Reading section -> Final test tab
  await page.goto('/learn/c-foundation/s-f1/final-test')
  await expect(page.getByRole('heading', { name: 'Final Test', exact: true })).toBeVisible()
  await expect(page.getByText(/Reading Final Test/)).toBeVisible()

  // Start Final Test -> shows TestIntroScreen first
  await page.getByRole('link', { name: /Vào phòng thi Final test/ }).click()
  await expect(page.getByRole('heading', { name: 'Hướng dẫn làm bài' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Thông tin bài test' })).toBeVisible()
  await page.getByRole('button', { name: /Bắt đầu/ }).click()

  // Answer Question 1 and exit mid-test via ExitConfirmDialog ("Thoát và lưu lại bài")
  await page
    .getByRole('radiogroup', { name: 'Câu 1' })
    .getByRole('radio', { name: /^A\s*TRUE$/ })
    .click()
  await page.getByRole('button', { name: 'Thoát' }).click()
  await expect(page.getByRole('dialog', { name: 'Thoát và lưu lại bài' })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Thoát' }).click()

  // Back on FinalTestPage: shows live countdown session & "Vào làm tiếp ngay"
  await expect(page).toHaveURL(/\/learn\/c-foundation\/s-f1\/final-test$/)
  await expect(page.getByRole('link', { name: /Vào làm tiếp ngay/ })).toBeVisible()
  await page.getByRole('link', { name: /Vào làm tiếp ngay/ }).click()

  // Submit the Final Test
  await page.getByRole('button', { name: /^Câu 13/ }).click()
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()

  // Redirects to Final Test result card with Đã chấm, Overall band, 4 skills, and CEFR scale
  await expect(page).toHaveURL(/\/learn\/c-foundation\/s-f1\/final-test$/)
  await expect(page.getByTestId('final-test-result-card')).toBeVisible()
  await expect(page.getByText('Đã chấm')).toBeVisible()
  await expect(page.getByText('Điểm làm bài')).toBeVisible()
  await expect(page.getByText('So sánh với CEFR scale')).toBeVisible()
  await expect(page.getByRole('link', { name: /Xem kết quả/ })).toBeVisible()

  // Verify the Final Test result appears on the History page with Band score
  await page.goto('/history')
  await expect(page.getByText(/Reading Final Test/)).toBeVisible()
})
