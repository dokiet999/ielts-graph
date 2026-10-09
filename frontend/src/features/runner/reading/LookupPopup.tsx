import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookA, Volume2, X } from 'lucide-react'
import { Spinner } from '@/components/ui/states'

interface DictionaryEntry {
  word: string
  phonetic?: string
  phonetics?: { text?: string; audio?: string }[]
  meanings: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[]
}

// Free public dictionary used during development; replace with a backend endpoint later.
async function lookup(word: string): Promise<DictionaryEntry | null> {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error('lookup failed')
  const data = (await res.json()) as DictionaryEntry[]
  return data[0] ?? null
}

export function LookupPopup({
  text,
  rect,
  onClose,
}: {
  text: string
  rect: DOMRect
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Look up single words; for phrases use the first word.
  const word = text
    .trim()
    .split(/\s+/)[0]
    .replace(/[^A-Za-z'-]/g, '')
    .toLowerCase()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dictionary', word],
    queryFn: () => lookup(word),
    enabled: !!word,
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [onClose])

  const width = 320
  const left = Math.min(
    Math.max(8, rect.left + rect.width / 2 - width / 2),
    window.innerWidth - width - 8,
  )
  const below = rect.bottom + 8
  const top = below + 260 > window.innerHeight ? Math.max(8, rect.top - 268) : below
  const audio = data?.phonetics?.find((p) => p.audio)?.audio
  const phonetic = data?.phonetic ?? data?.phonetics?.find((p) => p.text)?.text

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Tra nghĩa: ${word}`}
      className="fixed z-50 max-h-64 overflow-y-auto rounded-xl border bg-surface p-4 shadow-xl"
      style={{ left, top, width }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookA className="size-4 text-primary" />
          <span className="text-lg font-semibold">{word || text}</span>
          {phonetic && <span className="text-sm text-muted-foreground">{phonetic}</span>}
          {audio && (
            <button
              type="button"
              aria-label="Phát âm"
              className="rounded-md p-1 text-info hover:bg-muted"
              onClick={() => new Audio(audio).play().catch(() => {})}
            >
              <Volume2 className="size-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="rounded-md p-1 hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
      {!word ? (
        <p className="text-sm text-muted-foreground">Hãy chọn một từ tiếng Anh.</p>
      ) : isLoading ? (
        <Spinner className="size-5" />
      ) : isError ? (
        <p className="text-sm text-muted-foreground">
          Không kết nối được từ điển. Vui lòng thử lại.
        </p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Không tìm thấy nghĩa của từ này.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {data.meanings.slice(0, 3).map((m, i) => (
            <li key={i}>
              <span className="font-medium italic text-info">{m.partOfSpeech}</span>
              <ol className="ml-4 mt-1 list-decimal space-y-1">
                {m.definitions.slice(0, 2).map((d, j) => (
                  <li key={j}>
                    {d.definition}
                    {d.example && (
                      <span className="block text-muted-foreground">“{d.example}”</span>
                    )}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
