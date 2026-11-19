import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpenCheck,
  ChevronRight,
  CircleCheck,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { PageTitle, SectionLabel } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/progress'
import { Select } from '@/components/ui/select'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { formatBand } from '@/lib/band'
import {
  criterionHint,
  criterionName,
  MASTERY_LABEL,
  masteryLevel,
  nodeName,
  personalizationErrorMessage,
  STATUS_LABEL,
  STATUS_TONE,
  TARGET_BANDS,
  weaknessMessage,
} from '@/lib/personalization'
import { usePersonalization, useSetTargetBand } from '@/lib/queries'
import type {
  BandPoint,
  CriterionGap,
  CriterionProfile,
  ProfileSkill,
  SkillProfile,
  Weakness,
} from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'

const SKILL_LABEL: Record<ProfileSkill, string> = { WRITING: 'Writing', SPEAKING: 'Speaking' }

/** Overall band of every attempt, with the target as a dashed line. */
function BandChart({ points, target }: { points: BandPoint[]; target: number | null }) {
  if (points.length < 2) return null
  const w = 320
  const h = 96
  const pad = 8
  const bands = points.map((p) => p.band).concat(target ?? [])
  const lo = Math.max(0, Math.floor(Math.min(...bands)) - 0.5)
  const hi = Math.min(9, Math.ceil(Math.max(...bands)) + 0.5)
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (points.length - 1)
  const y = (b: number) => h - pad - ((b - lo) * (h - 2 * pad)) / (hi - lo || 1)
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-24 w-full max-w-sm"
      role="img"
      aria-label={`Band qua ${points.length} lần làm bài, lần gần nhất ${formatBand(points[points.length - 1].band)}`}
    >
      {target !== null && (
        <line
          x1={pad}
          x2={w - pad}
          y1={y(target)}
          y2={y(target)}
          className="stroke-success"
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
      )}
      <polyline
        fill="none"
        className="stroke-primary"
        strokeWidth={2.5}
        strokeLinejoin="round"
        points={points.map((p, i) => `${x(i)},${y(p.band)}`).join(' ')}
      />
      {points.map((p, i) => (
        <circle key={p.submissionId} cx={x(i)} cy={y(p.band)} r={3.5} className="fill-primary" />
      ))}
    </svg>
  )
}

function SkillHeader({ profile }: { profile: SkillProfile }) {
  const setTarget = useSetTargetBand()
  return (
    <div className="card flex flex-wrap items-center gap-6 p-5">
      <div>
        <p className="text-sm text-muted-foreground">Band hiện tại (3 bài gần nhất)</p>
        <p className="text-3xl font-bold">{formatBand(profile.currentBand)}</p>
        <p className="text-sm text-muted-foreground">{profile.attemptCount} bài đã chấm</p>
      </div>
      <div>
        <label htmlFor="target-band" className="text-sm text-muted-foreground">
          Band mục tiêu
        </label>
        <Select
          id="target-band"
          className="mt-1 w-36"
          value={profile.targetBand ?? ''}
          disabled={setTarget.isPending}
          onChange={(e) =>
            e.target.value &&
            setTarget.mutate({ skill: profile.skill, targetBand: Number(e.target.value) })
          }
        >
          <option value="">Chưa chọn</option>
          {TARGET_BANDS.map((b) => (
            <option key={b} value={b}>
              {b.toFixed(1)}
            </option>
          ))}
        </Select>
        {setTarget.isError && (
          <p className="mt-1 text-sm text-danger">{errorMessage(setTarget.error)}</p>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <BandChart points={profile.bandHistory} target={profile.targetBand} />
      </div>
    </div>
  )
}

/** Error → SubSkill → Criterion: the path in the Knowledge Graph that explains the weakness. */
function KgPath({ w }: { w: Weakness }) {
  const steps = [nodeName(w.errorType), nodeName(w.subSkill), criterionName(w.criterion)]
  return (
    <p
      className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
      aria-label="Đường đi trong Knowledge Graph"
    >
      {steps.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3" />}
          <span className="rounded-md bg-muted px-1.5 py-0.5">{s}</span>
        </span>
      ))}
    </p>
  )
}

function MasteryBar({ mastery }: { mastery: number | null }) {
  const level = masteryLevel(mastery)
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <ProgressBar
        value={Math.round((mastery ?? 0) * 100)}
        className="w-28"
        tone={level === 'strong' ? 'success' : level === 'developing' ? 'info' : 'primary'}
      />
      <span>
        {MASTERY_LABEL[level]}
        {mastery !== null && ` (${Math.round(mastery * 100)}%)`}
      </span>
    </div>
  )
}

function WeaknessCard({ w }: { w: Weakness }) {
  const name = nodeName(w.errorType)
  return (
    <li className="card space-y-3 p-5" aria-label={name}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{name}</p>
        <Badge tone={STATUS_TONE[w.status]}>{STATUS_LABEL[w.status]}</Badge>
        <span className="text-xs text-muted-foreground">Lần cuối: {formatDate(w.lastSeenAt)}</span>
      </div>
      <KgPath w={w} />
      <p className="text-sm">{weaknessMessage(w)}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-xs text-muted-foreground">Kỹ năng {nodeName(w.subSkill)}:</span>
        <MasteryBar mastery={w.mastery} />
      </div>
      {w.prerequisite && (
        <p className="flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning">
          <Lightbulb className="mt-0.5 size-4 shrink-0" />
          Nên củng cố {nodeName(w.prerequisite)} trước: đây là kỹ năng nền của{' '}
          {nodeName(w.subSkill)} và đang yếu.
        </p>
      )}
      {w.resources.length > 0 ? (
        <ul className="space-y-2">
          {w.resources.map((r) => {
            const rname = r.nameVi ?? r.nameEn ?? r.resourceId
            return (
              <li
                key={r.resourceId}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-muted p-3"
              >
                <BookOpenCheck className="size-4 text-primary" />
                <span className="min-w-0 flex-1 text-sm font-medium">{rname}</span>
                {r.fixesError && <Badge tone="primary">Sửa đúng lỗi này</Badge>}
                {r.practicedCount > 0 && (
                  <Badge tone="neutral">Đã luyện {r.practicedCount} lần</Badge>
                )}
                {r.exerciseId && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/run/${r.exerciseId}`} aria-label={`Luyện ngay: ${rname}`}>
                      Luyện ngay <ArrowRight />
                    </Link>
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chưa có bài luyện cho lỗi này. Hãy chú ý lỗi này ở bài làm tiếp theo.
        </p>
      )}
    </li>
  )
}

function GapCard({ g }: { g: CriterionGap }) {
  return (
    <li className="card space-y-2 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{criterionName(g.criterion)}</p>
        <Badge tone="warning">
          {formatBand(g.currentBand)} / mục tiêu {formatBand(g.targetBand)}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {g.activeErrorCount > 0
          ? `Còn ${g.activeErrorCount} lỗi đang theo dõi ở tiêu chí này (xem phần Cần ưu tiên).`
          : 'Bài làm ít lỗi ở tiêu chí này: band đang bị giới hạn bởi độ phong phú, không phải lỗi sai.'}
      </p>
      <p className="flex items-start gap-2 text-sm">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
        {criterionHint(g.criterion.id)}
      </p>
    </li>
  )
}

function CriterionCard({ c, target }: { c: CriterionProfile; target: number | null }) {
  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{criterionName(c.criterion)}</p>
        <span className="text-sm text-muted-foreground">
          {c.currentBand !== null ? formatBand(c.currentBand) : 'Chưa có dữ liệu'}
          {target !== null && c.currentBand !== null && ` / ${formatBand(target)}`}
        </span>
      </div>
      <ul className="space-y-2">
        {c.subSkills.map((s) => (
          <li key={s.subSkill.id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">{nodeName(s.subSkill)}</span>
            <MasteryBar mastery={s.mastery} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function SkillView({ profile }: { profile: SkillProfile }) {
  const active = profile.weaknesses.filter((w) => w.status !== 'RESOLVED')
  const resolved = profile.weaknesses.filter((w) => w.status === 'RESOLVED')

  if (profile.attemptCount === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title={`Chưa có bài ${SKILL_LABEL[profile.skill]} nào được chấm`}
        description="Hãy làm một bài để hệ thống bắt đầu theo dõi điểm mạnh và điểm yếu của bạn."
        action={
          <Button asChild>
            <Link to="/courses">Đến khóa học</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-10">
      <SkillHeader profile={profile} />

      <section aria-labelledby="priority-heading">
        <SectionLabel>
          <span id="priority-heading" className="flex items-center gap-2">
            <Target className="size-4" /> Cần ưu tiên
          </span>
        </SectionLabel>
        {active.length > 0 ? (
          <ol className="space-y-4">
            {active.map((w) => (
              <WeaknessCard key={w.errorType.id} w={w} />
            ))}
          </ol>
        ) : (
          <p className="card p-5 text-sm text-muted-foreground">
            Không còn lỗi nào đang theo dõi. Hãy xem các tiêu chí chưa đạt mục tiêu bên dưới.
          </p>
        )}
      </section>

      {profile.targetBand === null ? (
        <p className="card flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <TrendingUp className="size-4" /> Chọn band mục tiêu để xem tiêu chí nào còn cách mục
          tiêu.
        </p>
      ) : (
        profile.gaps.length > 0 && (
          <section aria-labelledby="gap-heading">
            <SectionLabel>
              <span id="gap-heading" className="flex items-center gap-2">
                <TrendingUp className="size-4" /> Tiêu chí chưa đạt mục tiêu
              </span>
            </SectionLabel>
            <ul className="space-y-4">
              {profile.gaps.map((g) => (
                <GapCard key={g.criterion.id} g={g} />
              ))}
            </ul>
          </section>
        )
      )}

      <section aria-labelledby="map-heading">
        <SectionLabel>
          <span id="map-heading">Bản đồ năng lực</span>
        </SectionLabel>
        <div className="grid gap-4 md:grid-cols-2">
          {profile.criteria.map((c) => (
            <CriterionCard key={c.criterion.id} c={c} target={profile.targetBand} />
          ))}
        </div>
      </section>

      {resolved.length > 0 && (
        <section aria-labelledby="resolved-heading">
          <SectionLabel>
            <span id="resolved-heading" className="flex items-center gap-2">
              <CircleCheck className="size-4" /> Đã khắc phục
            </span>
          </SectionLabel>
          <ul className="space-y-2">
            {resolved.map((w) => (
              <li
                key={w.errorType.id}
                className="card flex flex-wrap items-center gap-2 p-4 text-sm"
              >
                <Badge tone="success">{STATUS_LABEL.RESOLVED}</Badge>
                <span className="font-medium">{nodeName(w.errorType)}</span>
                <span className="text-muted-foreground">{weaknessMessage(w)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export function PersonalizationPage() {
  const { data, isLoading, error, refetch } = usePersonalization()
  const [skill, setSkill] = useState<ProfileSkill>('WRITING')
  const profile = data?.skills.find((s) => s.skill === skill)

  return (
    <div>
      <PageTitle
        title="Cá nhân hóa"
        subtitle="Điểm yếu của bạn qua các lần làm bài Writing và Speaking, xếp hạng bằng Knowledge Graph."
      />
      <div className="mb-6 flex gap-2" role="tablist" aria-label="Kỹ năng">
        {(['WRITING', 'SPEAKING'] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={skill === s}
            onClick={() => setSkill(s)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              skill === s ? 'bg-primary-soft text-primary' : 'text-foreground/80 hover:bg-muted',
            )}
          >
            {SKILL_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : error ? (
        <ErrorState message={personalizationErrorMessage(error)} onRetry={() => refetch()} />
      ) : profile ? (
        <SkillView profile={profile} />
      ) : null}
    </div>
  )
}
