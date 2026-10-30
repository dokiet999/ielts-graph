import { expect, test, type Page } from '@playwright/test'

// Issue #32: submit → errors found by the AI → practice exercises recommended by the Knowledge Graph.
// Runs against the MSW mock, whose KG is built from kg/data/*.csv (same data as Neo4j).

const KG_DOWN_KEY = 'mock:kg-unavailable'

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('demo@ielts.dev')
  await page.getByLabel('Mật khẩu').fill('123456')
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page.getByRole('heading', { name: /Xin chào/ })).toBeVisible()
}

const sentence = 'Online learning gives many students a lot of freedom to study at home. '
const essay = sentence.repeat(5).trim()

async function submitEssay(page: Page) {
  await page.goto('/run/ex-i-writing-01')
  await page.getByRole('textbox', { name: 'Bài viết của bạn' }).fill(essay)
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page).toHaveURL(/\/submissions\/sub-/)
}

/** 8 kHz 8-bit mono PCM WAV of silence: small, and every browser reads its duration. */
function wav(seconds: number) {
  const rate = 8000
  const samples = Math.round(seconds * rate)
  const buf = Buffer.alloc(44 + samples, 128)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + samples, 4)
  buf.write('WAVEfmt ', 8)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(1, 22) // mono
  buf.writeUInt32LE(rate, 24)
  buf.writeUInt32LE(rate, 28) // byte rate
  buf.writeUInt16LE(1, 32) // block align
  buf.writeUInt16LE(8, 34) // bits per sample
  buf.write('data', 36)
  buf.writeUInt32LE(samples, 40)
  return buf
}

const audioInput = (page: Page) => page.getByLabel('Chọn file âm thanh')
const panel = (page: Page) => page.getByRole('region', { name: 'Bài luyện gợi ý' })

test.beforeEach(async ({ page }) => {
  // Fresh mock data, empty session, KG up.
  await page.goto('/login')
  await page.evaluate(() => localStorage.clear())
})

test('writing: submit → errors → recommended exercises → open a drill', async ({ page }) => {
  await login(page)
  const kgRequest = page.waitForRequest((r) => r.url().includes('/api/kg/recommendations'))
  await submitEssay(page)

  // The request carries the grader's errors in feedback order, and an integer band.
  const url = new URL((await kgRequest).url())
  expect(url.searchParams.get('skill')).toBe('SKILL_W')
  expect(url.searchParams.get('errors')).toBe(
    'ERR_UNDERDEVELOPED,ERR_LINKER_MISUSE,ERR_COLLOCATION,ERR_ARTICLE',
  )
  expect(url.searchParams.get('band')).toMatch(/^\d$/)

  // Each error found in the essay gets its own list of exercises, with the reason.
  const recs = panel(page)
  await expect(recs).toBeVisible()
  const articles = recs.getByRole('list', { name: 'Bài luyện cho lỗi Mạo từ' })
  const drill = articles.getByRole('listitem', { name: 'Bài tập mạo từ cơ bản' })
  await expect(drill).toContainText('Luyện kỹ năng Mạo từ')
  await expect(drill).toContainText('Grammatical Range & Accuracy')
  await expect(recs.getByRole('list', { name: 'Bài luyện cho lỗi Sai collocation' })).toBeVisible()
  await expect(recs.getByRole('list')).toHaveCount(4)

  // The rest of the result page is unchanged (criteria cards are the only articles).
  await expect(page.getByRole('article')).toHaveCount(4)

  // "Luyện ngay" opens the drill (an exercise of migration V13) in the runner.
  await drill.getByRole('link', { name: /Luyện ngay/ }).click()
  await expect(page).toHaveURL(/\/run\/60000000-0000-0000-0000-000000000001$/)
  await expect(page.getByText(/Choose the correct article/)).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Câu 1' })).toContainText('the')

  // Back on the result page after a reload, the recommendations are still there: the detail
  // endpoint returns the structured feedback.
  await page.goBack()
  await page.reload()
  await expect(panel(page).getByRole('listitem', { name: 'Bài tập mạo từ cơ bản' })).toBeVisible()
})

test('writing: an unavailable knowledge graph does not break the result page', async ({ page }) => {
  await login(page)
  await page.evaluate((key) => localStorage.setItem(key, '1'), KG_DOWN_KEY)
  await submitEssay(page)

  const status = panel(page).getByRole('status')
  await expect(status).toContainText('tạm thời không khả dụng')
  await expect(page.getByLabel(/^Band tổng/)).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(4)

  // Once the KG is back, "Thử lại" loads the recommendations.
  await page.evaluate((key) => localStorage.removeItem(key), KG_DOWN_KEY)
  await status.getByRole('button', { name: 'Thử lại' }).click()
  await expect(panel(page).getByRole('listitem', { name: 'Bài tập mạo từ cơ bản' })).toBeVisible()
})

test('speaking: submit audio → errors → recommended exercises and uncovered errors', async ({
  page,
}) => {
  await login(page)
  await page.goto('/run/ex-i-speaking-01')
  await expect(page.getByText(/tối đa 30 MB, 5 phút/)).toBeVisible()

  await audioInput(page).setInputFiles({
    name: 'answer.wav',
    mimeType: 'audio/wav',
    buffer: wav(40),
  })
  // The browser reads the duration of the file and shows it.
  await expect(page.getByText(/Thời lượng: 00:40/)).toBeVisible()
  const kgRequest = page.waitForRequest((r) => r.url().includes('/api/kg/recommendations'))
  await page.getByRole('button', { name: 'Nộp bài' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Nộp bài' }).click()
  await expect(page).toHaveURL(/\/submissions\/sub-/)

  expect(new URL((await kgRequest).url()).searchParams.get('skill')).toBe('SKILL_S')
  const recs = panel(page)
  await expect(
    recs.getByRole('list', { name: 'Bài luyện cho lỗi Thì của động từ' }).getByRole('listitem'),
  ).toHaveCount(1)
  await expect(recs.getByRole('list', { name: 'Bài luyện cho lỗi Lặp từ' })).toBeVisible()
  // Pause, self-correction and stress have no practice Resource in the KG yet (W5_issue.md #8).
  await expect(recs).toContainText(
    'Chưa có bài luyện cho: Ngập ngừng / ngừng lâu, Tự sửa lại nhiều lần, Sai trọng âm từ.',
  )
})

test('speaking: audio over the limits is rejected before upload', async ({ page }) => {
  await login(page)
  const uploads: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/submit/speaking')) uploads.push(r.url())
  })
  await page.goto('/run/ex-i-speaking-01')
  const alert = page.getByRole('alert')
  const submit = page.getByRole('button', { name: 'Nộp bài' })

  await audioInput(page).setInputFiles({
    name: 'too-big.mp3',
    mimeType: 'audio/mpeg',
    buffer: Buffer.alloc(31 * 1024 * 1024),
  })
  await expect(alert).toContainText('vượt quá dung lượng tối đa 30 MB')
  await expect(submit).toBeDisabled()

  await audioInput(page).setInputFiles({
    name: 'too-long.wav',
    mimeType: 'audio/wav',
    buffer: wav(301),
  })
  await expect(alert).toContainText('dài hơn 5 phút')
  await expect(page.getByText('too-long.wav')).toHaveCount(0)
  await expect(submit).toBeDisabled()

  expect(uploads).toEqual([])
})
