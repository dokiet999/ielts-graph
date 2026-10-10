import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ListeningContent } from '@/lib/types'
import { formatClock } from '@/lib/utils'

const RATES = [0.75, 1, 1.25]

function RateSelect({ rate, onChange }: { rate: number; onChange: (r: number) => void }) {
  return (
    <div className="flex rounded-lg bg-muted p-0.5" role="group" aria-label="Tốc độ phát">
      {RATES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          aria-pressed={rate === r}
          className={`rounded-md px-2 py-1 text-xs font-medium ${rate === r ? 'bg-surface shadow-sm' : 'text-muted-foreground'}`}
        >
          {r}x
        </button>
      ))}
    </div>
  )
}

/**
 * Fallback when the exercise has no playable audio (the sample data points to placeholder
 * URLs): reads the transcript aloud with the browser's speech synthesis.
 */
function SpeechPlayer({ transcript }: { transcript: ListeningContent['transcript'] }) {
  const [index, setIndex] = useState(-1)
  const [paused, setPaused] = useState(false)
  const [rate, setRate] = useState(1)
  const stopped = useRef(true)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const speakFrom = (i: number) => {
    if (i >= transcript.length) {
      stopped.current = true
      setIndex(-1)
      return
    }
    const u = new SpeechSynthesisUtterance(transcript[i].text)
    u.lang = 'en-GB'
    u.rate = rate
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'))
    // Alternate voices between speakers so dialogues are easier to follow.
    const speakers = [...new Set(transcript.map((t) => t.speaker))]
    if (voices.length) u.voice = voices[speakers.indexOf(transcript[i].speaker) % voices.length]
    u.onend = () => !stopped.current && speakFrom(i + 1)
    setIndex(i)
    window.speechSynthesis.speak(u)
  }

  const play = () => {
    if (paused) {
      window.speechSynthesis.resume()
      setPaused(false)
      return
    }
    window.speechSynthesis.cancel()
    stopped.current = false
    speakFrom(0)
  }
  const pause = () => {
    window.speechSynthesis.pause()
    setPaused(true)
  }
  const stop = () => {
    stopped.current = true
    window.speechSynthesis.cancel()
    setPaused(false)
    setIndex(-1)
  }

  if (!supported) {
    return (
      <p className="text-sm text-muted-foreground">
        Trình duyệt không hỗ trợ phát audio cho bài này.
      </p>
    )
  }
  const playing = index >= 0 && !paused
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="icon"
          className="rounded-full"
          onClick={playing ? pause : play}
          aria-label={playing ? 'Tạm dừng' : 'Phát'}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="rounded-full"
          onClick={stop}
          disabled={index < 0}
          aria-label="Dừng"
        >
          <Square />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${index < 0 ? 0 : ((index + 1) / transcript.length) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {index < 0 ? 'Sẵn sàng' : `Đoạn ${index + 1}/${transcript.length}`}
          </p>
        </div>
        <RateSelect rate={rate} onChange={setRate} />
      </div>
      <p className="text-xs text-muted-foreground">
        Bài này chưa có file audio, hệ thống đang dùng giọng đọc tự động của trình duyệt.
      </p>
    </div>
  )
}

export function AudioPlayer({
  src,
  transcript,
}: {
  src: string | null
  transcript: ListeningContent['transcript']
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [failed, setFailed] = useState(!src)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRate] = useState(1)

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate])

  if (failed || !src) return <SpeechPlayer transcript={transcript} />

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) a.play().catch(() => setFailed(true))
    else a.pause()
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onError={() => setFailed(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <Button
        size="icon"
        className="rounded-full"
        onClick={toggle}
        aria-label={playing ? 'Tạm dừng' : 'Phát'}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="rounded-full"
        aria-label="Lùi 5 giây"
        onClick={() => audioRef.current && (audioRef.current.currentTime -= 5)}
      >
        <RotateCcw />
      </Button>
      <span className="w-12 text-xs tabular-nums text-muted-foreground">
        {formatClock(current)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={current}
        onChange={(e) =>
          audioRef.current && (audioRef.current.currentTime = Number(e.target.value))
        }
        className="min-w-0 flex-1 accent-[hsl(var(--primary))]"
        aria-label="Tua audio"
      />
      <span className="w-12 text-xs tabular-nums text-muted-foreground">
        {formatClock(duration)}
      </span>
      <RateSelect rate={rate} onChange={setRate} />
    </div>
  )
}
