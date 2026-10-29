import type { Highlight } from './highlight'
import type { SpeakingCriterionId, SpeakingEvidence, SpeakingPartId } from './types'
import { AI_DISCLAIMER, bandTone, evidenceHighlights } from './writing'

export { AI_DISCLAIMER, bandTone }

export const SPEAKING_MIN_DURATION_SEC = 5
/** Same as app.speaking.max-file-size-bytes of the backend. */
export const SPEAKING_MAX_FILE_BYTES = 30 * 1024 * 1024
/** Same as ASR_MAX_DURATION_SEC of ai/asr_service: longer audio is rejected before transcription. */
export const SPEAKING_MAX_DURATION_SEC = 300
export const SPEAKING_ALLOWED_EXTENSIONS = ['webm', 'ogg', 'mp3', 'wav', 'm4a'] as const

const MAX_MB = SPEAKING_MAX_FILE_BYTES / (1024 * 1024)
const MAX_MINUTES = SPEAKING_MAX_DURATION_SEC / 60

/** Shown next to the upload buttons. */
export const SPEAKING_LIMITS_HINT = `Hỗ trợ định dạng .webm, .ogg, .mp3, .wav, .m4a (tối đa ${MAX_MB} MB, ${MAX_MINUTES} phút).`
export const AUDIO_TOO_LARGE_MESSAGE = `File âm thanh vượt quá dung lượng tối đa ${MAX_MB} MB.`
export const AUDIO_TOO_LONG_MESSAGE = `Bản ghi âm dài hơn ${MAX_MINUTES} phút. Vui lòng cắt ngắn hoặc ghi âm lại.`
export const UNSUPPORTED_AUDIO_MESSAGE =
  'Định dạng file âm thanh không được hỗ trợ. Vui lòng chọn file .webm, .ogg, .mp3, .wav hoặc .m4a.'

export const SPEAKING_CRITERIA: readonly SpeakingCriterionId[] = [
  'CRIT_S_FC',
  'CRIT_S_LR',
  'CRIT_S_GRA',
  'CRIT_S_P',
]

export const SPEAKING_CRITERIA_LABELS: Record<
  SpeakingCriterionId,
  { name: string; hint: string }
> = {
  CRIT_S_FC: {
    name: 'Fluency & Coherence',
    hint: 'Độ trôi chảy, mạch lạc và liên kết ý khi nói',
  },
  CRIT_S_LR: {
    name: 'Lexical Resource',
    hint: 'Vốn từ vựng và cách dùng từ tự nhiên',
  },
  CRIT_S_GRA: {
    name: 'Grammatical Range & Accuracy',
    hint: 'Đa dạng và chính xác về cấu trúc ngữ pháp',
  },
  CRIT_S_P: {
    name: 'Pronunciation',
    hint: 'Phát âm, trọng âm từ và ngữ điệu',
  },
}

export const SPEAKING_ERROR_LABELS: Record<string, string> = {
  ERR_LONG_PAUSE: 'Ngập ngừng / ngừng lâu',
  ERR_SELF_CORRECTION: 'Tự sửa lại nhiều lần',
  ERR_SHORT_ANSWER: 'Câu trả lời quá ngắn',
  ERR_WORD_CHOICE: 'Chọn từ chưa phù hợp',
  ERR_COLLOCATION: 'Sai collocation',
  ERR_REPETITION: 'Lặp từ',
  ERR_ARTICLE: 'Mạo từ',
  ERR_VERB_TENSE: 'Thì của động từ',
  ERR_SVA: 'Hòa hợp chủ ngữ - động từ',
  ERR_NOUN_NUM: 'Danh từ số ít/số nhiều',
  ERR_PREP: 'Giới từ',
  ERR_SENT_STRUCTURE: 'Cấu trúc câu',
  ERR_MISPRONOUNCE: 'Phát âm chưa chuẩn',
  ERR_WORD_STRESS: 'Sai trọng âm từ',
  ERR_MONOTONE: 'Ngữ điệu đều / thiếu nhấn nhá',
}

export const speakingErrorLabel = (code: string) => SPEAKING_ERROR_LABELS[code] ?? code

export const SPEAKING_PART_INFO: Record<
  SpeakingPartId,
  { name: string; durationHint: string; minRecommendedSec: number; maxRecommendedSec: number }
> = {
  QT_S_PART1: {
    name: 'Speaking Part 1',
    durationHint: '20–45 giây',
    minRecommendedSec: 20,
    maxRecommendedSec: 60,
  },
  QT_S_PART2: {
    name: 'Speaking Part 2',
    durationHint: '1–2 phút (60–120 giây)',
    minRecommendedSec: 60,
    maxRecommendedSec: 120,
  },
  QT_S_PART3: {
    name: 'Speaking Part 3',
    durationHint: '45–90 giây',
    minRecommendedSec: 45,
    maxRecommendedSec: 90,
  },
}

export function speakingPartInfo(part: string | null | undefined) {
  if (part === 'QT_S_PART1' || part === 'QT_S_PART2' || part === 'QT_S_PART3') {
    return SPEAKING_PART_INFO[part]
  }
  return SPEAKING_PART_INFO.QT_S_PART2
}

export function isSupportedAudioFilename(filename: string): boolean {
  const dot = filename.lastIndexOf('.')
  if (dot < 0 || dot === filename.length - 1) return false
  const ext = filename.slice(dot + 1).toLowerCase()
  return (SPEAKING_ALLOWED_EXTENSIONS as readonly string[]).includes(ext)
}

const SUBMIT_ERROR: Record<string, string> = {
  UNSUPPORTED_AUDIO: UNSUPPORTED_AUDIO_MESSAGE,
  AUDIO_TOO_SHORT: `Bản ghi âm quá ngắn (cần ít nhất ${SPEAKING_MIN_DURATION_SEC} giây) hoặc không nhận diện được giọng nói.`,
  AUDIO_TOO_LARGE: AUDIO_TOO_LARGE_MESSAGE,
  // Not sent by the backend yet (it maps the ASR 413 to ASR_BAD_RESPONSE, see W5_issue.md #1).
  AUDIO_TOO_LONG: AUDIO_TOO_LONG_MESSAGE,
  ASR_UNAVAILABLE:
    'Dịch vụ nhận diện giọng nói tạm thời không khả dụng. Bản ghi của bạn vẫn được giữ lại, hãy thử nộp lại sau ít phút.',
  ASR_TIMEOUT:
    'Dịch vụ nhận diện giọng nói phản hồi quá lâu. Bản ghi của bạn vẫn được giữ lại, hãy thử nộp lại.',
  LLM_UNAVAILABLE:
    'Dịch vụ chấm bài AI đang quá tải hoặc tạm thời không khả dụng. Bản ghi của bạn vẫn được giữ lại, hãy thử nộp lại sau ít phút.',
  LLM_TIMEOUT: 'AI phản hồi quá lâu. Bản ghi của bạn vẫn được giữ lại, hãy thử nộp lại.',
  MAX_ATTEMPTS_REACHED: 'Bạn đã dùng hết số lần làm của bài này.',
  SUBMISSION_CONFLICT: 'Một lượt nộp khác đang được lưu, vui lòng thử lại.',
}

const AI_RESULT_ERROR =
  'AI chưa trả về kết quả hợp lệ. Bản ghi của bạn vẫn được giữ lại, hãy thử nộp lại.'

export function speakingSubmitMessage(code: string | undefined, status: number | undefined) {
  if (code && SUBMIT_ERROR[code]) return SUBMIT_ERROR[code]
  if (status === 502) return AI_RESULT_ERROR
  return undefined
}

export function isRetryableSpeakingError(code: string | undefined, status: number | undefined) {
  return (
    code === 'ASR_UNAVAILABLE' ||
    code === 'ASR_TIMEOUT' ||
    code === 'LLM_UNAVAILABLE' ||
    code === 'LLM_TIMEOUT' ||
    status === 502 ||
    status === 503
  )
}

export function speakingEvidenceHighlights(
  transcript: string,
  evidence: SpeakingEvidence[],
): Highlight[] {
  return evidenceHighlights(transcript, evidence)
}

/**
 * Duration of an audio file read by the browser, or undefined when it cannot tell (unknown codec,
 * a WebM without duration, no media support): the backend still checks it.
 */
export function readAudioDuration(blob: Blob, timeoutMs = 5000): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (typeof Audio === 'undefined') return resolve(undefined)
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    const done = (value: number | undefined) => {
      window.clearTimeout(timer)
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const timer = window.setTimeout(() => done(undefined), timeoutMs)
    audio.preload = 'metadata'
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : undefined)
    audio.onerror = () => done(undefined)
    audio.src = url
  })
}
