import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Target } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/states'
import { useKgRecommendations } from '@/lib/queries'
import {
  bandParam,
  errorCodesOf,
  practicePath,
  recommendationsErrorMessage,
  recommendationsFor,
} from '@/lib/recommendations'
import { speakingErrorLabel } from '@/lib/speaking'
import type { KgRecommendation, KgSkill } from '@/lib/types'
import { errorLabel as writingErrorLabel } from '@/lib/writing'

const HEADING_ID = 'recommended-practice'

function BandMatchBadge({ rec, band }: { rec: KgRecommendation; band: number | null }) {
  if (rec.bandMatch === 'exact' && band !== null) return <Badge tone="success">Band {band}</Badge>
  if (rec.bandMatch === 'nearest') return <Badge tone="info">Gần band của bạn</Badge>
  return null
}

function RecommendationCard({ rec, band }: { rec: KgRecommendation; band: number | null }) {
  const to = practicePath(rec)
  const name = rec.nameVi ?? rec.nameEn ?? rec.resourceId
  const { subSkill, criterion } = rec.path
  return (
    <li className="card flex flex-wrap items-center gap-4 p-4" aria-label={name}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{name}</p>
          <BandMatchBadge rec={rec} band={band} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Luyện kỹ năng {subSkill.nameVi ?? subSkill.nameEn ?? subSkill.id} · tiêu chí{' '}
          {criterion.nameEn ?? criterion.nameVi ?? criterion.id}
        </p>
      </div>
      {to && (
        <Button size="sm" variant="outline" asChild>
          <Link to={to} aria-label={`Luyện ngay: ${name}`}>
            Luyện ngay <ArrowRight />
          </Link>
        </Button>
      )}
    </li>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className="mb-4 mt-10 flex items-center gap-2 text-xl font-semibold">
        <Target className="size-5 text-primary" /> Bài luyện gợi ý
      </h2>
      {children}
    </section>
  )
}

const Muted = ({ children }: { children: React.ReactNode }) => (
  <p className="card p-5 text-sm text-muted-foreground">{children}</p>
)

/**
 * Practice exercises for the errors the AI found, from the Knowledge Graph
 * (GET /api/kg/recommendations). A failing KG never hides the rest of the result page.
 * `criteria` is null when the structured feedback is not known (an old submission).
 */
export function RecommendedPractice({
  skill,
  criteria,
  overallBand,
}: {
  skill: KgSkill
  criteria: { evidence: { errorType: string }[] }[] | null
  overallBand: number | null | undefined
}) {
  const errors = criteria ? errorCodesOf(criteria) : []
  const request = errors.length > 0 ? { skill, errors, band: bandParam(overallBand) } : null
  const query = useKgRecommendations(request)
  const label = skill === 'SKILL_S' ? speakingErrorLabel : writingErrorLabel

  if (!criteria) {
    return (
      <Section>
        <Muted>
          Bài luyện được gợi ý theo các lỗi AI tìm thấy. Lần mở lại này không còn danh sách lỗi nên
          chưa gợi ý được bài luyện.
        </Muted>
      </Section>
    )
  }
  if (errors.length === 0) {
    return (
      <Section>
        <Muted>AI không ghi nhận lỗi cụ thể nào trong bài này nên chưa có bài luyện gợi ý.</Muted>
      </Section>
    )
  }
  if (query.isPending) {
    return (
      <Section>
        <div aria-busy="true" aria-label="Đang tìm bài luyện phù hợp" className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </Section>
    )
  }
  if (query.isError) {
    return (
      <Section>
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <p className="min-w-0 flex-1">{recommendationsErrorMessage(query.error)}</p>
          <Button size="sm" variant="outline" onClick={() => query.refetch()}>
            Thử lại
          </Button>
        </div>
      </Section>
    )
  }

  const { recommendations, unmatchedErrors, bandApplied } = query.data
  const matched = errors.filter((e) => recommendationsFor(recommendations, e).length > 0)
  return (
    <Section>
      {matched.length === 0 ? (
        <Muted>Hiện chưa có bài luyện cho các lỗi: {errors.map(label).join(', ')}.</Muted>
      ) : (
        <div className="space-y-6">
          {matched.map((errorId) => (
            <div key={errorId}>
              <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
                Lỗi: <Badge tone="warning">{label(errorId)}</Badge>
              </h3>
              <ul className="space-y-3" aria-label={`Bài luyện cho lỗi ${label(errorId)}`}>
                {recommendationsFor(recommendations, errorId).map((rec) => (
                  <RecommendationCard key={rec.resourceId} rec={rec} band={bandApplied} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {matched.length > 0 && unmatchedErrors.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          Chưa có bài luyện cho: {unmatchedErrors.map(label).join(', ')}.
        </p>
      )}
    </Section>
  )
}
