import { Headphones } from 'lucide-react'
import type { ListeningContent } from '@/lib/types'
import { AudioPlayer } from './AudioPlayer'

export function ListeningPane({
  content,
  audioUrl,
  instruction,
  showTranscript,
}: {
  content: ListeningContent
  audioUrl: string | null
  instruction: string | null
  showTranscript: boolean
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6" style={{ fontSize: 'var(--reading-font-size)' }}>
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Headphones className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">Listening</p>
          <h2 className="text-[1.3em] font-bold">{content.sectionTitle}</h2>
        </div>
      </div>
      {instruction && <p className="text-foreground/90">{instruction}</p>}
      <div className="card p-4">
        <AudioPlayer src={audioUrl} transcript={content.transcript} />
      </div>

      {showTranscript ? (
        <div>
          <h3 className="mb-3 font-semibold">Transcript</h3>
          <div className="space-y-3">
            {content.transcript.map((line, i) => (
              <p key={i}>
                <b className="mr-2 text-info">{line.speaker}:</b>
                {line.text}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Đọc trước câu hỏi bên phải trước khi bấm phát audio.</li>
          <li>Transcript sẽ hiển thị khi bạn xem lại bài sau khi nộp.</li>
        </ul>
      )}
    </div>
  )
}
