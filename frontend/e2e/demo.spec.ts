import { expect, test } from '@playwright/test'

// Runs against a dev server started with VITE_DEMO_USER set (see playwright.demo.config.ts):
// no login page, and every API call carries HTTP Basic credentials like the real backend.

test('demo mode skips login and sends HTTP Basic credentials', async ({ page }) => {
  const authHeaders: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/api/')) authHeaders.push(req.headers()['authorization'] ?? '')
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Xin chào, Enrolled Student/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Hồ sơ' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Tài khoản' })).toHaveCount(0)

  // Guests-only pages are unreachable.
  await page.goto('/login')
  await expect(page).toHaveURL(/localhost:\d+\/$/)
  await page.goto('/profile')
  await expect(page).toHaveURL(/localhost:\d+\/$/)

  expect(authHeaders.length).toBeGreaterThan(0)
  const expected = 'Basic ' + Buffer.from('student_enrolled:Demo@123').toString('base64')
  expect(new Set(authHeaders)).toEqual(new Set([expected]))
})

test('demo mode: course → exercise → submit → result → history', async ({ page }) => {
  await page.goto('/courses')
  await page.getByRole('link', { name: /IELTS Foundation 5.0/ }).click()
  await page.getByRole('link', { name: /Reading nền tảng/ }).click()
  await page.getByRole('link', { name: 'Bài luyện' }).click()
  await page.getByRole('link', { name: /Farming in the Sky/ }).click()

  await page
    .getByRole('radiogroup', { name: 'Câu 1' })
    .getByRole('radio', { name: /^A\s*TRUE$/ })
    .click()
  const request = page.waitForRequest((r) => r.url().includes('/submit'))
  await page.getByRole('button', { name: /^Câu 13/ }).click()
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()

  // Choice answers are sent as one string, never as an array.
  const body = (await request).postDataJSON() as {
    answers: Record<string, unknown>
    timeSpent: number
  }
  expect(Object.values(body.answers).every((v) => typeof v === 'string')).toBe(true)
  expect(typeof body.timeSpent).toBe('number')

  await expect(page).toHaveURL(/\/submissions\/sub-/)
  await page.goto('/history')
  await expect(page.getByRole('link', { name: /Farming in the Sky/ }).first()).toBeVisible()
})
