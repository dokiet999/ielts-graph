import type { Highlight } from './highlight'
import type { WritingCriterionId, WritingEvidence } from './types'

/** The backend rejects shorter essays before any AI call (WritingSubmissionServiceImpl). */
export const WRITING_MIN_SUBMIT_WORDS = 50
/** WritingSubmissionRequest allows at most 10000 characters. */
export const WRITING_MAX_CHARS = 10000

/** Shown on every AI result page (SRS FR-3.03). */
export const AI_DISCLAIMER =
  'Điểm và nhận xét do AI tạo ra theo band descriptors công khai của IELTS, chỉ mang tính hỗ trợ luyện tập và không phải điểm thi chính thức.'

/** Same rule as the backend: words are separated by whitespace. */
export function countWords(text: string) {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

/** Task 2 asks for 250 words. Task 1 (150 words, SRS 1.5.1) is not graded by the backend yet. */
export function writingMinWords(taskType: string | null | undefined) {
  return taskType?.startsWith('QT_W1_') ? 150 : 250
}

export const CRITERION_LABEL: Record<WritingCriterionId, { name: string; hint: string }> = {
  CRIT_W_TR: { name: 'Task Response', hint: 'Trả lời đúng và đủ yêu cầu của đề' },
  CRIT_W_CC: { name: 'Coherence & Cohesion', hint: 'Bố cục, mạch lạc và liên kết ý' },
  CRIT_W_LR: { name: 'Lexical Resource', hint: 'Vốn từ và cách dùng từ' },
  CRIT_W_GRA: { name: 'Grammatical Range & Accuracy', hint: 'Đa dạng và chính xác về ngữ pháp' },
}

/** ErrorType ids of the ontology (the ones the backend lets through per criterion). */
const ERROR_LABEL: Record<string, string> = {
  ERR_OFF_TOPIC: 'Lạc đề',
  ERR_PARTIAL_ANSWER: 'Trả lời chưa đủ các phần của đề',
  ERR_UNDER_LENGTH: 'Bài quá ngắn',
  ERR_UNCLEAR_POSITION: 'Quan điểm chưa rõ ràng',
  ERR_UNDERDEVELOPED: 'Ý chưa được phát triển',
  ERR_LINKER_MISUSE: 'Dùng từ nối chưa đúng',
  ERR_LINKER_OVERUSE: 'Lạm dụng từ nối',
  ERR_NO_PARAGRAPH: 'Chưa chia đoạn',
  ERR_UNCLEAR_REFERENCE: 'Tham chiếu không rõ',
  ERR_WORD_CHOICE: 'Chọn từ chưa phù hợp',
  ERR_COLLOCATION: 'Sai collocation',
  ERR_REPETITION: 'Lặp từ',
  ERR_SPELLING: 'Sai chính tả',
  ERR_WORD_FORM: 'Sai dạng từ',
  ERR_ARTICLE: 'Mạo từ',
  ERR_VERB_TENSE: 'Thì của động từ',
  ERR_SVA: 'Hòa hợp chủ ngữ - động từ',
  ERR_NOUN_NUM: 'Danh từ số ít/số nhiều',
  ERR_PREP: 'Giới từ',
  ERR_SENT_STRUCTURE: 'Cấu trúc câu',
  ERR_PUNCT: 'Dấu câu',
}

/** Unknown codes (the ontology can grow) are shown as they are. */
export const errorLabel = (code: string) => ERROR_LABEL[code] ?? code

export type BandTone = 'success' | 'warning' | 'danger'

export function bandTone(band: number): BandTone {
  return band >= 7 ? 'success' : band >= 5.5 ? 'warning' : 'danger'
}

/** Backend error codes → Vietnamese messages (the backend sends English ones). */
const SUBMIT_ERROR: Record<string, string> = {
  LLM_UNAVAILABLE:
    'Dịch vụ chấm bài AI đang quá tải hoặc tạm thời không khả dụng. Bài viết của bạn vẫn được giữ lại, hãy thử nộp lại sau ít phút.',
  LLM_TIMEOUT: 'AI phản hồi quá lâu. Bài viết của bạn vẫn được giữ lại, hãy thử nộp lại.',
  ESSAY_TOO_SHORT: `Bài viết cần có ít nhất ${WRITING_MIN_SUBMIT_WORDS} từ để được chấm.`,
  MAX_ATTEMPTS_REACHED: 'Bạn đã dùng hết số lần làm của bài này.',
  SUBMISSION_CONFLICT: 'Một lượt nộp khác đang được lưu, vui lòng thử lại.',
}

/** A bad AI answer (WritingGradingException, HTTP 502): the learner can simply try again. */
const AI_RESULT_ERROR =
  'AI chưa trả về kết quả hợp lệ. Bài viết của bạn vẫn được giữ lại, hãy thử nộp lại.'

export function writingSubmitMessage(code: string | undefined, status: number | undefined) {
  if (code && SUBMIT_ERROR[code]) return SUBMIT_ERROR[code]
  if (status === 502) return AI_RESULT_ERROR
  return undefined
}

/** True when trying again may work (AI overloaded, slow or invalid answer), not for rule violations. */
export function isRetryableWritingError(code: string | undefined, status: number | undefined) {
  return code === 'LLM_UNAVAILABLE' || code === 'LLM_TIMEOUT' || status === 502 || status === 503
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Regex that finds `quote` in the essay the way the backend matched it: case-insensitive, any run of
 * whitespace equal, curly and straight quotes equal.
 */
function quotePattern(quote: string) {
  const source = quote
    .trim()
    .split(/\s+/)
    .map((word) =>
      [...word]
        .map((ch) =>
          /['\u2018\u2019]/.test(ch)
            ? "['\u2018\u2019]"
            : /["\u201C\u201D]/.test(ch)
              ? '["\u201C\u201D]'
              : escapeRegExp(ch),
        )
        .join(''),
    )
    .join('\\s+')
  return new RegExp(source, 'i')
}

/**
 * Where each evidence quote sits in the essay, as highlights with id `e-<index>` (index in
 * `evidence`). A quote that is not found, or overlaps an earlier one, gets no highlight.
 */
export function evidenceHighlights(essay: string, evidence: WritingEvidence[]): Highlight[] {
  const taken: Highlight[] = []
  evidence.forEach((e, index) => {
    if (!e.quote.trim()) return
    const match = quotePattern(e.quote).exec(essay)
    if (!match) return
    const start = match.index
    const end = start + match[0].length
    if (taken.some((h) => start < h.end && end > h.start)) return
    taken.push({ id: `e-${index}`, paragraph: 0, start, end })
  })
  return taken
}
