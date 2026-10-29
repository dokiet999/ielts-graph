import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Clock,
  Loader2,
  Mic,
  Moon,
  RotateCcw,
  Square,
  Sun,
  Type,
  Upload,
  X,
} from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/menu'
import { speakingSubmitError } from '@/lib/api'
import { useSubmitSpeaking } from '@/lib/queries'
import {
  isSupportedAudioFilename,
  SPEAKING_MAX_FILE_BYTES,
  SPEAKING_MIN_DURATION_SEC,
  speakingPartInfo,
} from '@/lib/speaking'
import type { Exercise } from '@/lib/types'
import { cn, formatClock } from '@/lib/utils'
import { useSessionStore } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { useSpeakingResultsStore } from '@/stores/speakingResults'
import { useRunnerTimer } from '../test/useRunnerTimer'

function speakingPrompt(exercise: Exercise) {
  const question = exercise.questionGroups[0]?.questions[0]?.questionText
  return exercise.instruction?.trim() || question || exercise.title
}

function speakingPart(exercise: Exercise): string {
  const part = (exercise.content as { part?: unknown } | null)?.part
  return typeof part === 'string' && part.startsWith('QT_S_PART') ? part : 'QT_S_PART2'
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function GradingOverlay() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-xl"
      >
        <Loader2 className="mx-auto size-8 animate-spin text-primary" />
        <p className="mt-4 font-semibold">AI đang chấm bài nói của bạn...</p>
        <p className="mt-1 text-sm tabular-nums text-muted-foreground">Đã chờ {seconds} giây</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {seconds < 35
            ? 'Hệ thống đang chuyển giọng nói thành văn bản và chấm điểm. Vui lòng không đóng trang.'
            : 'Lần này AI phản hồi chậm hơn bình thường, vui lòng chờ thêm một chút.'}
        </p>
      </div>
    </div>
  )
}

export function SpeakingRunner({ exercise, onExit }: { exercise: Exercise; onExit: () => void }) {
  const navigate = useNavigate()
  const clear = useSessionStore((s) => s.clear)
  const saveResult = useSpeakingResultsStore((s) => s.save)
  const { dark, toggleDark, cycleFontSize, fontSize } = useSettingsStore()
  const submit = useSubmitSpeaking()

  const [audioBlob, setAudioBlob] = useState<Blob | File | null>(null)
  const [audioFilename, setAudioFilename] = useState<string>('recording.webm')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioDurationSec, setAudioDurationSec] = useState<number | undefined>(undefined)
  const [isRecording, setIsRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const [localError, setLocalError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const recordStartRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const partId = speakingPart(exercise)
  const partInfo = speakingPartInfo(partId)

  const { elapsed, remaining } = useRunnerTimer(exercise.id, exercise.timeLimit, {
    running: !submit.isPending && !submit.isSuccess,
  })
  const timeUp = remaining === 0

  useEffect(() => {
    if (!isRecording) return
    const id = window.setInterval(() => {
      setRecordSeconds(Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000)))
    }, 500)
    return () => window.clearInterval(id)
  }, [isRecording])

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [audioUrl])

  const replaceAudio = (blob: Blob | File, filename: string, durationSec?: number) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(blob)
    setAudioFilename(filename)
    setAudioDurationSec(durationSec)
    setAudioUrl(URL.createObjectURL(blob))
  }

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setAudioDurationSec(undefined)
    setRecordSeconds(0)
    setLocalError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const startRecording = async () => {
    setLocalError(null)
    submit.reset()
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setLocalError('Trình duyệt không hỗ trợ ghi âm trực tiếp. Vui lòng tải file âm thanh lên.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data)
        }
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const ext = mimeType.includes('ogg')
          ? 'ogg'
          : mimeType.includes('mp4') || mimeType.includes('m4a')
            ? 'm4a'
            : 'webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const dur = Math.max(1, Math.round((Date.now() - recordStartRef.current) / 1000))
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setIsRecording(false)
        if (dur < SPEAKING_MIN_DURATION_SEC) {
          setLocalError(
            `Bản ghi âm quá ngắn (${dur} giây). Cần ít nhất ${SPEAKING_MIN_DURATION_SEC} giây để nộp bài.`,
          )
          return
        }
        replaceAudio(blob, `recording.${ext}`, dur)
      }

      recordStartRef.current = Date.now()
      setRecordSeconds(0)
      setIsRecording(true)
      recorder.start()
    } catch {
      setLocalError(
        'Không thể truy cập micro. Vui lòng cấp quyền micro cho trình duyệt hoặc tải file âm thanh lên.',
      )
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalError(null)
    submit.reset()

    if (!isSupportedAudioFilename(file.name)) {
      setLocalError(
        'Định dạng file âm thanh không được hỗ trợ. Vui lòng chọn file .webm, .ogg, .mp3, .wav hoặc .m4a.',
      )
      return
    }
    if (file.size > SPEAKING_MAX_FILE_BYTES) {
      setLocalError('File âm thanh vượt quá dung lượng tối đa 30 MB.')
      return
    }
    if (file.size === 0) {
      setLocalError('File âm thanh rỗng. Vui lòng chọn một file hợp lệ.')
      return
    }
    replaceAudio(file, file.name, undefined)
  }

  const finish = () => {
    if (!audioBlob) return
    setConfirmOpen(false)
    submit.mutate(
      {
        exerciseId: exercise.id,
        audio: audioBlob,
        filename: audioFilename,
        part: partId,
        durationSec: audioDurationSec,
      },
      {
        onSuccess: (result) => {
          saveResult(result.submissionId, result.feedback)
          clear(exercise.id)
          navigate(`/submissions/${result.submissionId}`, { replace: true })
        },
      },
    )
  }

  const apiError = submit.error ? speakingSubmitError(submit.error) : null
  const canSubmit = !!audioBlob && !isRecording && !submit.isPending

  return (
    <div className="flex h-screen flex-col bg-surface">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Button variant="outline" size="icon" onClick={onExit} aria-label="Thoát">
          <X />
        </Button>
        <LogoMark className="hidden size-8 sm:block" />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <span className="hidden font-semibold sm:inline">Làm bài Speaking</span>
          <span
            className={cn(
              'flex items-center gap-1.5 font-semibold tabular-nums text-info',
              timeUp && 'text-danger',
            )}
            title={remaining !== null ? 'Thời gian còn lại' : 'Thời gian đã làm'}
          >
            <Clock className="size-4" />
            {formatClock(remaining ?? elapsed)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content={`Cỡ chữ: ${fontSize}px`}>
            <Button variant="ghost" size="icon" onClick={cycleFontSize} aria-label="Đổi cỡ chữ">
              <Type />
            </Button>
          </Tooltip>
          <Tooltip content={dark ? 'Giao diện sáng' : 'Giao diện tối'}>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDark}
              aria-label="Đổi giao diện sáng/tối"
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </Tooltip>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        <section
          aria-label="Đề bài"
          className="overflow-y-auto border-b p-5 sm:p-8 lg:border-b-0 lg:border-r"
          style={{ fontSize }}
        >
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Mic className="size-4" /> {partInfo.name}
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight">{exercise.title}</h1>
          <p className="mt-4 whitespace-pre-line leading-relaxed">{speakingPrompt(exercise)}</p>
          <div className="mt-6 space-y-2 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            <p>
              <strong>Thời lượng khuyến nghị:</strong> {partInfo.durationHint} (tối thiểu{' '}
              {SPEAKING_MIN_DURATION_SEC} giây).
            </p>
            <p>
              AI chuyển giọng nói thành văn bản và chấm theo 4 tiêu chí IELTS Speaking: Fluency
              &amp; Coherence, Lexical Resource, Grammatical Range &amp; Accuracy và Pronunciation.
            </p>
          </div>
        </section>

        <section className="flex min-h-0 flex-col justify-between overflow-y-auto p-5 sm:p-8">
          <div className="space-y-5">
            {(localError || apiError) && (
              <div
                role="alert"
                className="flex flex-wrap items-center gap-3 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger"
              >
                <AlertTriangle className="size-4 shrink-0" />
                <p className="min-w-0 flex-1">{localError ?? apiError?.message}</p>
                {apiError?.retryable && (
                  <Button size="sm" variant="outline" onClick={finish}>
                    Thử lại
                  </Button>
                )}
              </div>
            )}

            <div className="rounded-2xl border bg-background p-6 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Mic className={cn('size-8', isRecording && 'animate-pulse text-danger')} />
              </div>

              {isRecording ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-danger">Đang ghi âm...</p>
                  <p className="text-3xl font-bold tabular-nums">{formatClock(recordSeconds)}</p>
                  <Button variant="outline" onClick={stopRecording}>
                    <Square className="size-4 fill-current" /> Dừng ghi âm
                  </Button>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="font-semibold">Ghi âm trực tiếp hoặc tải file âm thanh lên</p>
                  <p className="text-sm text-muted-foreground">
                    Hỗ trợ định dạng .webm, .ogg, .mp3, .wav, .m4a (tối đa 30 MB).
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button onClick={startRecording} type="button">
                      <Mic className="size-4" /> Bắt đầu ghi âm
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-4" /> Tải file âm thanh
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".webm,.ogg,.mp3,.wav,.m4a,audio/*"
                      onChange={handleFileChange}
                      aria-label="Chọn file âm thanh"
                      className="sr-only"
                    />
                  </div>
                </div>
              )}
            </div>

            {audioBlob && (
              <div className="rounded-2xl border bg-background p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{audioFilename}</p>
                    <p className="text-xs text-muted-foreground">
                      Dung lượng: {formatBytes(audioBlob.size)}
                      {audioDurationSec !== undefined &&
                        ` · Thời lượng: ${formatClock(audioDurationSec)}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearAudio}>
                    <RotateCcw className="size-4" /> Ghi lại / Đổi file
                  </Button>
                </div>
                {audioUrl && (
                  <audio
                    controls
                    src={audioUrl}
                    aria-label="Nghe lại bản ghi âm"
                    className="mt-4 w-full"
                  />
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {audioBlob ? 'Đã sẵn sàng nộp bài nói.' : 'Chưa có bản ghi âm nào.'}
            </p>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSubmit}
              loading={submit.isPending}
            >
              Nộp bài
            </Button>
          </div>
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title="Nộp bài nói?"
          description={`File âm thanh: ${audioFilename}${audioDurationSec ? ` (${formatClock(audioDurationSec)})` : ''}.`}
        >
          <p className="mt-2 text-sm text-muted-foreground">
            Hệ thống sẽ nhận diện giọng nói và chấm điểm AI trong khoảng 15–45 giây. Mỗi lần nộp
            được tính là một lượt làm.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Quay lại
            </Button>
            <Button onClick={finish}>Nộp bài</Button>
          </div>
        </DialogContent>
      </Dialog>

      {submit.isPending && <GradingOverlay />}
    </div>
  )
}
