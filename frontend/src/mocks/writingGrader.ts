import type { BeWritingFeedback } from '@/lib/backend-types'
import { countWords } from '@/lib/writing'

// Stand-in for the AI grader of the backend (WritingEssayGrader): same output shape and the same
// rules (integer criterion bands, overall band = mean rounded to 0.5, quotes taken from the essay,
// a warning below 250 words), but the bands come from the length of the essay, not from a model.

const UNDER_LENGTH_WARNING = 'Bài viết chưa đạt độ dài tối thiểu 250 từ của IELTS Writing Task 2.'

/** First `n` words of a sentence: always a real quote of the essay. */
const quoteOf = (sentence: string, n: number) => sentence.trim().split(/\s+/).slice(0, n).join(' ')

export function overallBand(bands: number[]) {
  const mean = bands.reduce((a, b) => a + b, 0) / bands.length
  return Math.round(mean * 2) / 2
}

export function fakeWritingFeedback(essay: string, taskType: string): BeWritingFeedback {
  const words = countWords(essay)
  const base = words >= 320 ? 7 : words >= 250 ? 6 : words >= 150 ? 5 : 4
  // Slightly different bands per criterion, so the page shows a realistic spread.
  const bands = { CRIT_W_TR: base, CRIT_W_CC: base, CRIT_W_LR: base + 1, CRIT_W_GRA: base - 1 }
  const sentences = essay.split(/(?<=[.!?])\s+/).filter((s) => s.trim().split(/\s+/).length >= 4)
  const pick = (i: number, errorType: string, suggestion: string) =>
    sentences[i] ? [{ quote: quoteOf(sentences[i], 7), error_type: errorType, suggestion }] : []

  const improvements = [
    'Thêm ví dụ cụ thể để phát triển các ý chính ở thân bài.',
    'Đa dạng hóa từ nối thay vì lặp lại cùng một vài từ.',
    'Rà soát lỗi mạo từ và thì của động từ trước khi nộp.',
  ]
  if (words < 250) improvements.unshift(UNDER_LENGTH_WARNING)

  return {
    schema_version: '1.0',
    task: taskType,
    overall_band: overallBand(Object.values(bands)),
    out_of_calibration_range: false,
    criteria: {
      CRIT_W_TR: {
        band: bands.CRIT_W_TR,
        comment:
          'Bài nêu được quan điểm và trả lời các phần của đề, nhưng một số ý chưa được phát triển bằng ví dụ cụ thể.',
        evidence: pick(0, 'ERR_UNDERDEVELOPED', 'Thêm một ví dụ cụ thể để hỗ trợ cho ý chính.'),
      },
      CRIT_W_CC: {
        band: bands.CRIT_W_CC,
        comment: 'Bố cục tương đối rõ ràng, có dùng từ nối nhưng đôi chỗ còn máy móc.',
        evidence: pick(1, 'ERR_LINKER_MISUSE', 'Câu này nên dùng từ nối khác cho hợp ngữ cảnh.'),
      },
      CRIT_W_LR: {
        band: bands.CRIT_W_LR,
        comment: 'Vốn từ khá đủ cho chủ đề, vẫn còn vài lỗi chọn từ và collocation.',
        evidence: pick(2, 'ERR_COLLOCATION', 'Thử dùng một collocation tự nhiên hơn.'),
      },
      CRIT_W_GRA: {
        band: bands.CRIT_W_GRA,
        comment: 'Có dùng câu phức, nhưng còn lỗi mạo từ và thì của động từ lặp lại.',
        evidence: pick(3, 'ERR_ARTICLE', 'Kiểm tra lại mạo từ trước danh từ trong câu này.'),
      },
    },
    summary:
      'Đây là kết quả mô phỏng của chế độ demo (không gọi AI thật): band được suy ra từ độ dài bài viết.',
    improvements,
  }
}
