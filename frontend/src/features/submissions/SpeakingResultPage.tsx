import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Clock,
  History,
  Info,
  Lightbulb,
  Mic,
  RotateCcw,
  TriangleAlert,
  Volume2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatBand } from '@/lib/band'
import { segmentText } from '@/lib/highlight'
import {
  AI_DISCLAIMER,
  bandTone,
  SPEAKING_CRITERIA_LABELS,
  speakingErrorLabel,
  speakingEvidenceHighlights,
  speakingPartInfo,
} from '@/lib/speaking'
import type {
  SpeakingCriterion,
  SpeakingFeatures,
  SpeakingFeedback,
  SpeakingPronunciation,
  SubmissionDetail,
} from '@/lib/types'
import { EXERCISE_TYPE_LABEL, formatDateTime, formatDuration, SKILL_LABEL } from '@/lib/utils'
import { countWords } from '@/lib/writing'
import { useSpeakingResultsStore } from '@/stores/speakingResults'

function BandBadge({ band }: { band: number }) {
  return (
    <Badge tone={bandTone(band)} className="px-2.5 py-1 text-sm font-bold">
      Band {formatBand(band)}
    </Badge>
  )
}

function CriterionCard({ criterion }: { criterion: SpeakingCriterion }) {
  const label = SPEAKING_CRITERIA_LABELS[criterion.id]
  return (
    <article className="card p-5" aria-label={label.name}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{label.name}</h3>
          <p className="text-sm text-muted-foreground">{label.hint}</p>
        </div>
        <BandBadge band={criterion.band} />
      </div>
      {criterion.comment && <p className="mt-3 text-sm leading-relaxed">{criterion.comment}</p>}
      {criterion.evidence.length > 0 && (
        <ul className="mt-4 space-y-3">
          {criterion.evidence.map((e, i) => (
            <li key={i} className="rounded-xl bg-muted/60 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="warning">{speakingErrorLabel(e.errorType)}</Badge>
                <span className="text-xs text-muted-foreground">{e.errorType}</span>
              </div>
              <blockquote className="mt-2 border-l-2 border-warning pl-3 italic">
                “{e.quote}”
              </blockquote>
              {e.suggestion && <p className="mt-2 text-muted-foreground">{e.suggestion}</p>}
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function SpeechMetricsSection({
  features,
  pronunciation,
}: {
  features: SpeakingFeatures | null
  pronunciation: SpeakingPronunciation | null
}) {
  if (!features && !pronunciation) return null
  return (
    <div className="mt-10 grid gap-4 lg:grid-cols-2">
      {features && (
        <section className="card p-5" aria-label="Chỉ số giọng nói">
          <h2 className="flex items-center gap-2 font-semibold">
            <Activity className="size-4 text-primary" /> Chỉ số giọng nói (Speech Features)
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Thời lượng nói</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {features.durationSec.toFixed(1)}s
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Số từ</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{features.wordCount}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Tốc độ nói</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {features.speechRateWpm.toFixed(1)} WPM
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Số lần ngừng</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{features.pauseCount}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Tổng thời gian ngừng</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {features.totalPauseSec.toFixed(1)}s
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Ngừng dài nhất</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {features.longestPauseSec.toFixed(1)}s
              </p>
            </div>
          </div>
        </section>
      )}

      {pronunciation && (
        <section className="card p-5" aria-label="Đánh giá phát âm">
          <h2 className="flex items-center gap-2 font-semibold">
            <Volume2 className="size-4 text-info" /> Đánh giá phát âm (Pronunciation)
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Độ chính xác (Accuracy)</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {pronunciation.accuracy.toFixed(1)} / 100
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Độ trôi chảy (Fluency)</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {pronunciation.fluency.toFixed(1)} / 100
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Độ đầy đủ (Completeness)</p>
              <p className="mt-1 text-lg font-bold tabular-nums">
                {pronunciation.completeness.toFixed(1)} / 100
              </p>
            </div>
            {pronunciation.prosody !== null && (
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">Ngữ điệu (Prosody)</p>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {pronunciation.prosody.toFixed(1)} / 100
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function TranscriptWithEvidence({
  transcript,
  feedback,
}: {
  transcript: string
  feedback: SpeakingFeedback | null
}) {
  const evidence = feedback?.criteria.flatMap((c) => c.evidence) ?? []
  const segments = segmentText(transcript, speakingEvidenceHighlights(transcript, evidence))
  return (
    <p className="whitespace-pre-wrap leading-relaxed">
      {segments.map((seg, i) =>
        seg.highlight ? (
          <mark
            key={i}
            className="rounded bg-warning-soft px-0.5 text-foreground"
            title={speakingErrorLabel(evidence[Number(seg.highlight.id.slice(2))].errorType)}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </p>
  )
}

export function SpeakingResultPage({ sub }: { sub: SubmissionDetail }) {
  const cached = useSpeakingResultsStore((s) => s.results[sub.id])
  const feedback = sub.speakingFeedback ?? cached ?? null
  const transcript = sub.transcript || feedback?.transcript || ''
  const ex = sub.exercise
  const overall = feedback?.overallBand ?? sub.score
  const partInfo = speakingPartInfo(feedback?.part)
  const wordCount = feedback?.features?.wordCount ?? countWords(transcript)
  const backTo =
    ex.courseId && ex.sectionId ? `/learn/${ex.courseId}/${ex.sectionId}/exercises` : '/history'

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4">
        <Link to={backTo}>
          <ArrowLeft /> Quay lại
        </Link>
      </Button>

      <div className="card overflow-hidden">
        <div className="border-b bg-primary-soft/50 p-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">{SKILL_LABEL[sub.skillType]}</Badge>
            <Badge>{partInfo.name}</Badge>
            <Badge>{EXERCISE_TYPE_LABEL[sub.exerciseType]}</Badge>
            <Badge>Lần làm thứ {sub.attemptNumber}</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{sub.exerciseTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nộp lúc {formatDateTime(sub.submittedAt)}
          </p>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/60 px-10 py-6 text-center">
            <p className="text-sm text-muted-foreground">Band tổng</p>
            <p
              className="mt-1 text-5xl font-bold tabular-nums"
              aria-label={`Band tổng ${formatBand(overall)}`}
            >
              {formatBand(overall)}
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" /> {formatDuration(sub.timeSpent)} · {wordCount} từ
            </p>
          </div>
          <div>
            {feedback?.summary ? (
              <>
                <h2 className="font-semibold">Nhận xét chung</h2>
                <p className="mt-2 leading-relaxed">{feedback.summary}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nhận xét chi tiết theo từng tiêu chí hiện chưa khả dụng cho lượt nộp này.
              </p>
            )}
            {feedback?.outOfCalibrationRange && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                Band này nằm ngoài vùng 4–8 mà AI được hiệu chuẩn, nên có thể kém chính xác hơn.
              </p>
            )}
          </div>
        </div>
      </div>

      <p
        role="note"
        className="mt-4 flex items-start gap-2 rounded-xl bg-info-soft px-4 py-3 text-sm text-info"
      >
        <Info className="mt-0.5 size-4 shrink-0" /> {AI_DISCLAIMER}
      </p>

      <SpeechMetricsSection
        features={feedback?.features ?? null}
        pronunciation={feedback?.pronunciation ?? null}
      />

      {feedback && feedback.criteria.length > 0 && (
        <>
          <h2 className="mb-4 mt-10 text-xl font-semibold">Điểm theo tiêu chí</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {feedback.criteria.map((c) => (
              <CriterionCard key={c.id} criterion={c} />
            ))}
          </div>
        </>
      )}

      {feedback && feedback.improvements.length > 0 && (
        <>
          <h2 className="mb-4 mt-10 flex items-center gap-2 text-xl font-semibold">
            <Lightbulb className="size-5 text-warning" /> Cần cải thiện
          </h2>
          <ul className="card list-disc space-y-2 py-5 pl-9 pr-5 text-sm leading-relaxed">
            {feedback.improvements.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {transcript && (
        <>
          <h2 className="mb-4 mt-10 flex items-center gap-2 text-xl font-semibold">
            <Mic className="size-5" /> Bản ghi lời nói (Transcript)
          </h2>
          <div className="card p-5">
            <TranscriptWithEvidence transcript={transcript} feedback={feedback} />
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to={`/run/${sub.exerciseId}`}>
            <RotateCcw /> Làm lại
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/history">
            <History /> Lịch sử làm bài
          </Link>
        </Button>
      </div>
    </div>
  )
}
