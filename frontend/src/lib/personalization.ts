import axios from 'axios'
import { formatBand } from './band'
import type { KgNodeRef, Weakness, WeaknessStatus } from './types'

/** Target bands the learner can choose. */
export const TARGET_BANDS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9]

export const STATUS_LABEL: Record<WeaknessStatus, string> = {
  WEAK: 'Đang yếu',
  IMPROVING: 'Đang cải thiện',
  RESOLVED: 'Đã ổn',
}

export const STATUS_TONE: Record<WeaknessStatus, 'danger' | 'warning' | 'success'> = {
  WEAK: 'danger',
  IMPROVING: 'warning',
  RESOLVED: 'success',
}

export type MasteryLevel = 'weak' | 'developing' | 'strong' | 'unknown'

/** Same cut-offs as docs/learner-profile-rules.md: below 0.4 weak, below 0.65 developing. */
export function masteryLevel(mastery: number | null | undefined): MasteryLevel {
  if (mastery === null || mastery === undefined) return 'unknown'
  if (mastery < 0.4) return 'weak'
  if (mastery < 0.65) return 'developing'
  return 'strong'
}

export const MASTERY_LABEL: Record<MasteryLevel, string> = {
  weak: 'Yếu',
  developing: 'Trung bình',
  strong: 'Khá',
  unknown: 'Chưa có dữ liệu',
}

export function nodeName(ref: KgNodeRef | null | undefined): string {
  if (!ref) return ''
  return ref.nameVi ?? ref.nameEn ?? ref.id
}

/** Criteria are better known by their English IELTS names. */
export function criterionName(ref: KgNodeRef): string {
  return ref.nameEn ?? ref.nameVi ?? ref.id
}

/** One sentence explaining a weakness, built from what the learner did, not from a fixed rule text. */
export function weaknessMessage(w: Weakness): string {
  const criterion = criterionName(w.criterion)
  const band =
    w.criterionBand !== null
      ? w.targetBand !== null
        ? ` (đang ${formatBand(w.criterionBand)}, mục tiêu ${formatBand(w.targetBand)})`
        : ` (đang ${formatBand(w.criterionBand)})`
      : ''
  if (w.status === 'WEAK') {
    return `Lỗi này xuất hiện trong ${w.recentOccurrences}/${w.recentWindow} bài gần nhất (tổng ${w.occurrences} bài) và làm giảm tiêu chí ${criterion}${band}.`
  }
  if (w.status === 'IMPROVING') {
    const left = Math.max(0, 3 - w.cleanStreak)
    return `${w.cleanStreak} bài gần nhất không còn lỗi này. Giữ thêm ${left} bài nữa để được tính là đã ổn.`
  }
  return `Không còn xuất hiện trong ${w.cleanStreak} bài gần nhất.`
}

/**
 * What to work on when a criterion is below the target although few errors are found: the band
 * descriptors ask for range and depth, not only for the absence of errors.
 */
const CRITERION_HINT: Record<string, string> = {
  CRIT_W_TA:
    'Nêu rõ xu hướng chính trong câu tổng quan và chọn số liệu tiêu biểu để so sánh, thay vì liệt kê.',
  CRIT_W_TR:
    'Phát triển mỗi ý chính bằng lý do và ví dụ cụ thể, giữ quan điểm nhất quán từ mở bài đến kết luận.',
  CRIT_W_CC:
    'Mỗi đoạn một ý chính; nối ý bằng tham chiếu (this, these, such) và cấu trúc đoạn, không chỉ bằng từ nối.',
  CRIT_W_LR:
    'Dùng thêm từ ít phổ biến và collocation theo chủ đề, diễn đạt lại thay vì lặp từ của đề bài.',
  CRIT_W_GRA:
    'Dùng đa dạng câu phức (mệnh đề quan hệ, câu điều kiện, bị động) và tăng số câu hoàn toàn không lỗi.',
  CRIT_S_FC:
    'Trả lời dài hơn theo cấu trúc ý chính, lý do, ví dụ và nói liền mạch, giảm ngập ngừng giữa các ý.',
  CRIT_S_LR:
    'Dùng từ vựng theo chủ đề và cách diễn đạt tự nhiên hơn, thử diễn đạt một ý theo nhiều cách.',
  CRIT_S_GRA: 'Dùng thêm câu phức khi nói và giữ đúng thì động từ khi kể chuyện.',
  CRIT_S_P: 'Chú ý trọng âm từ và ngữ điệu lên xuống tự nhiên.',
}

export function criterionHint(criterionId: string): string {
  return (
    CRITERION_HINT[criterionId] ?? 'Đối chiếu bài làm với mô tả band mục tiêu của tiêu chí này.'
  )
}

/** A failed request of the tab: the Knowledge Graph being down is the usual cause. */
export function personalizationErrorMessage(error: unknown): string {
  const code = axios.isAxiosError(error)
    ? (error.response?.data as { code?: string } | undefined)?.code
    : undefined
  if (code === 'KG_UNAVAILABLE') {
    return 'Knowledge Graph đang tạm thời không khả dụng nên chưa phân tích được hồ sơ. Kết quả các bài đã chấm không bị ảnh hưởng.'
  }
  return 'Chưa tải được hồ sơ cá nhân hóa. Vui lòng thử lại sau.'
}
