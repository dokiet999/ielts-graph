import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lock,
  ShieldCheck,
  Timer,
} from 'lucide-react'
import { CoursePageHeader } from '@/layouts/CourseLayout'
import { useCourseContext } from '@/layouts/courseContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { estimateBand, formatBand } from '@/lib/band'
import { useMySubmissions, useSectionFinalTest } from '@/lib/queries'
import { formatClock, formatDateTime, SKILL_LABEL } from '@/lib/utils'
import { answeredCount, useSessionStore } from '@/stores/session'
import { FinalTestResultCard } from './FinalTestResultCard'

function remainingDaysText(expiresIso: string | null): string {
  if (!expiresIso) return ''
  const diffMs = new Date(expiresIso).getTime() - Date.now()
  if (diffMs <= 0) return 'Đã hết hạn'
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `Còn ${days} ngày ${hours} giờ`
  return `Còn ${Math.max(1, hours)} giờ`
}

export function FinalTestPage() {
  const { course, section } = useCourseContext()
  const { data, isLoading, error, refetch } = useSectionFinalTest(section.id)
  const { data: mySubmissions } = useMySubmissions()
  const [nowMs, setNowMs] = useState(() => Date.now())

  const exercise = data?.exercise ?? null
  const localSession = useSessionStore((s) => (exercise ? s.sessions[exercise.id] : undefined))

  // Tick every second when there is an active wall-clock session so the learner sees time running out live
  const activeStartedAtMs =
    localSession?.startedAt ??
    (data?.activeSession?.startedAt ? new Date(data.activeSession.startedAt).getTime() : null)
  const timeLimitSec = exercise?.timeLimit ?? 1200
  const activeExpiresAtMs = activeStartedAtMs ? activeStartedAtMs + timeLimitSec * 1000 : null
  const activeRemainingSec =
    activeExpiresAtMs !== null ? Math.max(0, Math.floor((activeExpiresAtMs - nowMs) / 1000)) : null
  const hasRunningSession = activeRemainingSec !== null && activeRemainingSec > 0

  useEffect(() => {
    if (!activeExpiresAtMs) return
    const id = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [activeExpiresAtMs])

  const isAiBand = exercise?.skillType === 'WRITING' || exercise?.skillType === 'SPEAKING'
  const bestBand =
    exercise && exercise.bestScore !== null
      ? isAiBand
        ? exercise.bestScore
        : estimateBand(exercise.skillType, exercise.bestScore, exercise.questionCount)
      : null
  const answered = answeredCount(localSession)

  const latestSubmission =
    (mySubmissions ?? []).find(
      (s) =>
        (exercise && s.id === exercise.lastSubmissionId) ||
        (exercise && s.exerciseId === exercise.id),
    ) ?? null

  const hasCompletedResult = bestBand !== null && exercise !== null

  return (
    <div>
      <CoursePageHeader title="Final Test">
        {bestBand !== null && (
          <div className="flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-2 text-sm font-semibold text-success">
            <Award className="size-4" />
            <span>Band Final Test: {formatBand(bestBand)}</span>
          </div>
        )}
      </CoursePageHeader>

      {isLoading ? (
        <div className="space-y-5">
          <Skeleton className="h-32" />
          <Skeleton className="h-56" />
        </div>
      ) : error ? (
        <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />
      ) : !exercise ? (
        <EmptyState
          icon={GraduationCap}
          title="Chưa có bài Final test cho kỹ năng này"
          description="Bài kiểm tra cuối khóa sẽ được cập nhật sớm."
        />
      ) : (
        <div className="space-y-6">
          {/* Completed Result View (matches screenshot) */}
          {hasCompletedResult && !hasRunningSession && (
            <FinalTestResultCard
              exercise={exercise}
              currentBand={bestBand}
              latestSubmission={latestSubmission}
              allSubmissions={mySubmissions ?? []}
              courseId={course.id}
              canRetake={Boolean(data?.unlocked)}
            />
          )}

          {/* Exam Entry Card (shown when not yet completed OR when a live wall-clock session is running) */}
          {(!hasCompletedResult || hasRunningSession) && (
            <>
              {/* Unlock Status & Deadline Banner */}
              {data?.unlocked ? (
                <div className="flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success-soft/60 px-5 py-4 text-sm">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="size-5 shrink-0 text-success" />
                    <div>
                      <p className="font-semibold text-success">
                        Bài Final test đã được mở khóa (Thời hạn {data.deadlineDays ?? 7} ngày)
                      </p>
                      {data.grantExpiresAt && (
                        <p className="mt-0.5 text-xs text-foreground/80">
                          Hạn chót làm bài: <b>{formatDateTime(data.grantExpiresAt)}</b> (
                          {remainingDaysText(data.grantExpiresAt)})
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge tone="success">Được phép dự thi</Badge>
                </div>
              ) : data?.grantExpired ? (
                <div className="flex max-w-3xl items-center gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-5 py-4 text-sm text-danger">
                  <AlertTriangle className="size-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Đã hết thời hạn mở bài Final test</p>
                    <p className="mt-0.5 text-xs">
                      Thời hạn {data.deadlineDays ?? 7} ngày đã kết thúc
                      {data.grantExpiresAt ? ` lúc ${formatDateTime(data.grantExpiresAt)}` : ''}.
                      Vui lòng liên hệ giảng viên phụ trách khóa học hoặc quản trị viên để được gia
                      hạn mở đề.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex max-w-3xl items-center gap-3 rounded-2xl border bg-muted/60 px-5 py-4 text-sm text-muted-foreground">
                  <Lock className="size-5 shrink-0 text-warning" />
                  <div>
                    <p className="font-semibold text-foreground">
                      Bài Final test đang khóa — Chờ cấp quyền mở bài
                    </p>
                    <p className="mt-0.5 text-xs">
                      Bài kiểm tra cuối chương sẽ được giảng viên phụ trách khóa học hoặc quản trị
                      viên mở khóa khi bạn đủ điều kiện dự thi.
                    </p>
                  </div>
                </div>
              )}

              {/* Main Final Test Entry Card */}
              <div className="card max-w-3xl overflow-hidden">
                <div className="border-b bg-primary-soft/40 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="primary">{SKILL_LABEL[exercise.skillType]}</Badge>
                      <Badge>Final test cuối khóa</Badge>
                      {exercise.timeLimit && (
                        <Badge>
                          <Timer className="size-3.5" /> {Math.round(exercise.timeLimit / 60)} phút
                        </Badge>
                      )}
                    </div>
                    {exercise.attemptCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                        <CheckCircle2 className="size-4" /> Đã hoàn thành {exercise.attemptCount} lần
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 text-2xl font-bold tracking-tight">{exercise.title}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Bài thi tổng kết cuối khóa kỹ năng {SKILL_LABEL[exercise.skillType]}. Khi bắt
                    đầu, hệ thống tạo phiên thi tính giờ theo thời gian thực kể từ lúc nhấn Bắt đầu.
                  </p>
                </div>

                <div className="space-y-5 p-6">
                  {/* Live Real-Time Session Alert when learner started and exited */}
                  {hasRunningSession && (
                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-warning/40 bg-warning-soft/70 p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="mt-0.5 size-5 shrink-0 animate-pulse text-warning" />
                        <div>
                          <p className="font-semibold text-foreground">
                            Phiên làm bài đang diễn ra — Đồng hồ vẫn đang tính giờ!
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Bài làm của bạn đã được lưu ({answered}/{exercise.questionCount} câu),
                            nhưng thời gian làm bài vẫn tiếp tục trôi ngay cả khi bạn thoát ra
                            ngoài.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-surface px-3.5 py-1.5 font-mono text-base font-bold tabular-nums text-danger shadow-sm">
                          Còn {formatClock(activeRemainingSec)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-muted/50 p-3.5">
                      <p className="text-xs text-muted-foreground">Số lượng câu hỏi</p>
                      <p className="mt-1 font-semibold">
                        {exercise.skillType === 'WRITING'
                          ? '1 đề Writing Task 2'
                          : exercise.skillType === 'SPEAKING'
                            ? '1 chủ đề Speaking'
                            : `${exercise.questionCount} câu hỏi`}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3.5">
                      <p className="text-xs text-muted-foreground">Quy định thời gian</p>
                      <p className="mt-1 font-semibold">
                        {exercise.timeLimit ? `${Math.round(exercise.timeLimit / 60)} phút` : 'Tự do'}{' '}
                        · Tính giờ liên tục
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3.5">
                      <p className="text-xs text-muted-foreground">Kết quả tốt nhất</p>
                      <p className="mt-1 font-semibold text-success">
                        {bestBand !== null ? `Band ${formatBand(bestBand)}` : 'Chưa có lượt nộp'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarClock className="size-4 shrink-0" />
                      <span>
                        Nếu thoát giữa chừng, hệ thống lưu câu trả lời nhưng thời gian vẫn tiếp tục
                        tính từ lúc bắt đầu.
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {data?.unlocked ? (
                        <Button asChild className="rounded-full px-6">
                          <Link to={`/run/${exercise.id}`}>
                            {hasRunningSession ? 'Vào làm tiếp ngay' : 'Vào phòng thi Final test'}{' '}
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button disabled className="rounded-full px-6">
                          <Lock className="size-4" /> Đang khóa (Chờ mở đề)
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
