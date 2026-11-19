import { Link } from 'react-router-dom'
import { Calendar, Clock, Crown, Eye, Gauge, RotateCcw, ThumbsUp } from 'lucide-react'
import { estimateBand, formatBand } from '@/lib/band'
import type { ExerciseSummary, SkillType, Submission } from '@/lib/types'
import { cn } from '@/lib/utils'

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

const CEFR_LEVELS: { level: CefrLevel; heightClass: string; minBand: number; maxBand: number }[] = [
  { level: 'A1', heightClass: 'h-3.5', minBand: 0, maxBand: 2.5 },
  { level: 'A2', heightClass: 'h-5', minBand: 3.0, maxBand: 3.5 },
  { level: 'B1', heightClass: 'h-7', minBand: 4.0, maxBand: 5.0 },
  { level: 'B2', heightClass: 'h-10', minBand: 5.5, maxBand: 6.5 },
  { level: 'C1', heightClass: 'h-12', minBand: 7.0, maxBand: 8.0 },
  { level: 'C2', heightClass: 'h-14', minBand: 8.5, maxBand: 9.0 },
]

const SKILL_ORDER: { key: SkillType; label: string }[] = [
  { key: 'LISTENING', label: 'Listening' },
  { key: 'READING', label: 'Reading' },
  { key: 'WRITING', label: 'Writing' },
  { key: 'SPEAKING', label: 'Speaking' },
]

export function bandToCefr(band: number): CefrLevel {
  if (band >= 8.5) return 'C2'
  if (band >= 7.0) return 'C1'
  if (band >= 5.5) return 'B2'
  if (band >= 4.0) return 'B1'
  if (band >= 3.0) return 'A2'
  return 'A1'
}

export function formatShortDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0m 00s'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins === 0) return `${secs}s`
  return `${mins}m ${String(secs).padStart(2, '0')}s`
}

export function formatDateSlash(iso: string | null | undefined): string {
  if (!iso) return '--/--/----'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--/--/----'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function roundIeltsBand(raw: number): number {
  return Math.round(raw * 2) / 2
}

function submissionBand(s: Submission): number {
  if (s.bandScore != null) return s.bandScore
  if (s.skillType === 'WRITING' || s.skillType === 'SPEAKING') return s.score
  return estimateBand(s.skillType, s.correctCount, s.questionCount) ?? 0
}

function AstronautMascot() {
  return (
    <div
      className="relative flex h-32 w-28 shrink-0 items-center justify-center select-none"
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 140" className="h-full w-full drop-shadow-md">
        <defs>
          <linearGradient id="helmetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="50%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="suitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>
        {/* Floating shadow */}
        <ellipse cx="60" cy="132" rx="26" ry="5" fill="#94a3b8" opacity="0.3" />
        {/* Backpack */}
        <rect x="30" y="58" width="60" height="44" rx="12" fill="#94a3b8" />
        {/* Left arm waving */}
        <path
          d="M34 72 C18 62, 14 48, 22 42 C27 38, 34 45, 38 58"
          fill="url(#suitGrad)"
          stroke="#cbd5e1"
          strokeWidth="2"
        />
        <circle cx="21" cy="43" r="6" fill="#ef4444" />
        {/* Right arm */}
        <path
          d="M86 72 C100 78, 104 90, 96 96 C90 100, 84 92, 82 82"
          fill="url(#suitGrad)"
          stroke="#cbd5e1"
          strokeWidth="2"
        />
        <circle cx="95" cy="95" r="6" fill="#ef4444" />
        {/* Legs */}
        <rect x="40" y="96" width="16" height="24" rx="8" fill="url(#suitGrad)" />
        <rect
          x="64"
          y="92"
          width="16"
          height="22"
          rx="8"
          transform="rotate(-12 64 92)"
          fill="url(#suitGrad)"
        />
        {/* Boots */}
        <rect x="38" y="113" width="20" height="10" rx="5" fill="#ef4444" />
        <rect
          x="66"
          y="107"
          width="20"
          height="10"
          rx="5"
          transform="rotate(-12 66 107)"
          fill="#ef4444"
        />
        {/* Torso */}
        <rect
          x="34"
          y="60"
          width="52"
          height="42"
          rx="16"
          fill="url(#suitGrad)"
          stroke="#e2e8f0"
          strokeWidth="2"
        />
        {/* Chest control badge */}
        <rect x="46" y="72" width="28" height="16" rx="4" fill="#1e293b" />
        <circle cx="53" cy="80" r="3" fill="#ef4444" />
        <circle cx="61" cy="80" r="3" fill="#38bdf8" />
        <circle cx="68" cy="80" r="2.5" fill="#22c55e" />
        {/* Red collar stripe */}
        <path d="M38 63 Q60 70 82 63" stroke="#ef4444" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* Helmet */}
        <circle
          cx="60"
          cy="38"
          r="28"
          fill="url(#helmetGrad)"
          stroke="#cbd5e1"
          strokeWidth="2.5"
        />
        {/* Helmet ears */}
        <rect x="28" y="32" width="6" height="14" rx="3" fill="#ef4444" />
        <rect x="86" y="32" width="6" height="14" rx="3" fill="#ef4444" />
        {/* Visor */}
        <rect x="37" y="22" width="46" height="32" rx="16" fill="url(#visorGrad)" />
        {/* Cute face inside visor */}
        <circle cx="50" cy="37" r="3.2" fill="#ffffff" />
        <circle cx="70" cy="37" r="3.2" fill="#ffffff" />
        <circle cx="51" cy="36" r="1.2" fill="#0f172a" />
        <circle cx="71" cy="36" r="1.2" fill="#0f172a" />
        <path
          d="M54 44 Q60 49 66 44"
          stroke="#ffffff"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
        />
        {/* Visor shine */}
        <path
          d="M43 27 Q52 24 62 27"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.65"
        />
      </svg>
    </div>
  )
}

export interface FinalTestResultCardProps {
  exercise: ExerciseSummary
  currentBand: number
  latestSubmission?: Submission | null
  allSubmissions?: Submission[]
  courseId?: string
  canRetake?: boolean
}

export function FinalTestResultCard({
  exercise,
  currentBand,
  latestSubmission,
  allSubmissions = [],
  courseId,
  canRetake = false,
}: FinalTestResultCardProps) {
  // Compute per-skill bands from FINAL_TEST (or MOCK_TEST fallback) submissions in the same course
  const skillBands: Record<SkillType, number | null> = {
    LISTENING: null,
    READING: null,
    WRITING: null,
    SPEAKING: null,
  }

  for (const { key } of SKILL_ORDER) {
    const matchingFinal = allSubmissions.filter(
      (s) =>
        s.skillType === key &&
        s.exerciseType === 'FINAL_TEST' &&
        (!courseId || !s.courseId || s.courseId === courseId),
    )
    if (matchingFinal.length > 0) {
      skillBands[key] = Math.max(...matchingFinal.map(submissionBand))
    }
  }

  // Always ensure the current skill shows its bestBand
  skillBands[exercise.skillType] = currentBand

  const availableBands = Object.values(skillBands).filter((b): b is number => b !== null)
  const overallBand =
    availableBands.length > 0
      ? roundIeltsBand(availableBands.reduce((a, b) => a + b, 0) / availableBands.length)
      : currentBand

  const activeCefr = bandToCefr(overallBand)
  const submissionId = latestSubmission?.id ?? exercise.lastSubmissionId
  const timeSpent = latestSubmission?.timeSpent ?? null
  const submittedAt = latestSubmission?.submittedAt ?? null

  return (
    <div
      className="max-w-3xl overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      data-testid="final-test-result-card"
    >
      {/* Top Section: Mascot + Info + Actions */}
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <AstronautMascot />

        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {exercise.title}
          </h2>

          {/* Skill Breadcrumb: Listening · Reading · Writing · Speaking */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {SKILL_ORDER.map((s, idx) => {
              const isCurrent = s.key === exercise.skillType
              return (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  {idx > 0 && <span className="text-muted-foreground/60">·</span>}
                  <span
                    className={cn(
                      isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {s.label}
                  </span>
                </span>
              )
            })}
          </div>

          <div className="space-y-1 pt-0.5 text-xs text-muted-foreground">
            <p className="flex items-center gap-2">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              <span>
                Thời gian làm bài:{' '}
                <strong className="font-semibold text-foreground">
                  {formatShortDuration(timeSpent)}
                </strong>
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
              <span>
                Ngày nộp:{' '}
                <strong className="font-semibold text-foreground">
                  {formatDateSlash(submittedAt)}
                </strong>
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              Đã chấm
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {canRetake && (
                <Link
                  to={`/run/${exercise.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" /> Làm lại
                </Link>
              )}
              {submissionId && (
                <Link
                  to={`/submissions/${submissionId}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted/50"
                >
                  <Eye className="size-4 text-emerald-600" /> Xem kết quả
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Điểm làm bài */}
      <div className="border-t border-border px-6 py-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Gauge className="size-3.5 text-muted-foreground" /> Điểm làm bài
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-8 sm:gap-12">
          {/* Overall Band */}
          <div className="min-w-[72px] text-center">
            <p
              className="text-3xl font-extrabold tabular-nums text-[#d92d20]"
              aria-label={`Overall band ${formatBand(overallBand)}`}
            >
              {formatBand(overallBand)}
            </p>
            <div className="mx-auto mt-1.5 h-1 w-12 overflow-hidden rounded-full bg-red-100">
              <div
                className="h-full rounded-full bg-[#d92d20]"
                style={{ width: `${Math.min(100, Math.round((overallBand / 9) * 100))}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Overall</p>
          </div>

          {/* 4 Skills Grid */}
          <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 sm:max-w-md">
            {SKILL_ORDER.map(({ key, label }) => {
              const b = skillBands[key]
              const isCurrent = key === exercise.skillType
              return (
                <div key={key} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'w-7 text-right text-sm font-bold tabular-nums',
                      b !== null ? 'text-foreground' : 'text-muted-foreground/50',
                    )}
                  >
                    {b !== null ? formatBand(b) : '--'}
                  </span>
                  <div className="h-1 w-7 overflow-hidden rounded-full bg-muted">
                    {b !== null && (
                      <div
                        className={cn(
                          'h-full rounded-full',
                          isCurrent ? 'bg-primary' : 'bg-muted-foreground/50',
                        )}
                        style={{ width: `${Math.min(100, Math.round((b / 9) * 100))}%` }}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs',
                      isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: So sánh với CEFR scale */}
      <div className="border-t border-border px-6 py-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <ThumbsUp className="size-3.5 text-muted-foreground" /> So sánh với CEFR scale
        </p>

        <div
          className="mt-4 grid max-w-md grid-cols-6 items-end gap-2.5"
          role="group"
          aria-label={`Mức CEFR hiện tại: ${activeCefr}`}
        >
          {CEFR_LEVELS.map(({ level, heightClass }) => {
            const active = level === activeCefr
            return (
              <div key={level} className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex w-full items-center justify-center rounded-lg transition-colors',
                    heightClass,
                    active
                      ? 'bg-[#5b21b6] text-white shadow-xs'
                      : 'bg-muted text-muted-foreground/60',
                  )}
                >
                  {level === 'C2' && <Crown className="size-4" />}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs',
                    active ? 'font-bold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {level}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}