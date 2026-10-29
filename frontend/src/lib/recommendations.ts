import axios from 'axios'
import type { KgRecommendation, KgSkill, SkillType } from './types'

/** GET /api/kg/recommendations accepts 1-10 distinct ErrorType ids. */
export const KG_MAX_ERRORS = 10

const ERROR_CODE = /^ERR_[A-Z_]+$/

export function kgSkillOf(skillType: SkillType): KgSkill | null {
  if (skillType === 'WRITING') return 'SKILL_W'
  if (skillType === 'SPEAKING') return 'SKILL_S'
  return null
}

/**
 * ErrorType ids found by the AI grader, in the order they appear in the feedback, without
 * duplicates and malformed codes (the endpoint rejects the whole request for either).
 */
export function errorCodesOf(criteria: { evidence: { errorType: string }[] }[]): string[] {
  const codes: string[] = []
  for (const c of criteria) {
    for (const e of c.evidence) {
      const code = e.errorType.trim()
      if (ERROR_CODE.test(code) && !codes.includes(code)) codes.push(code)
    }
  }
  return codes.slice(0, KG_MAX_ERRORS)
}

/** The KG knows integer bands only: an overall 6.5 asks for band 6. Values outside 4-8 are clamped by the backend. */
export function bandParam(overallBand: number | null | undefined): number | undefined {
  return typeof overallBand === 'number' && Number.isFinite(overallBand) && overallBand > 0
    ? Math.floor(overallBand)
    : undefined
}

/** Runner path for a Resource (`exercises:<uuid>` → `/run/<uuid>`), null when it cannot be opened. */
export function practicePath(rec: Pick<KgRecommendation, 'sqlRef'>): string | null {
  const m = /^exercises:([0-9a-zA-Z-]+)$/.exec(rec.sqlRef ?? '')
  return m ? `/run/${m[1]}` : null
}

/** Recommendations of one error, in the order the backend ranked them. */
export function recommendationsFor(recs: KgRecommendation[], errorId: string) {
  return recs.filter((r) => r.path.errorType.id === errorId)
}

/** A failed recommendations request as the result page shows it. */
export function recommendationsErrorMessage(error: unknown): string {
  const code = axios.isAxiosError(error)
    ? (error.response?.data as { code?: string } | undefined)?.code
    : undefined
  if (code === 'KG_UNAVAILABLE' || (axios.isAxiosError(error) && error.response?.status === 503)) {
    return 'Hệ thống gợi ý bài luyện đang tạm thời không khả dụng. Kết quả chấm bài của bạn không bị ảnh hưởng.'
  }
  return 'Chưa tải được bài luyện gợi ý.'
}
