import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/input'
import { addHighlight, segmentText, selectionToOffsets, type Highlight } from '@/lib/highlight'
import type { ReadingContent } from '@/lib/types'
import { cn } from '@/lib/utils'
import { LookupPopup } from './LookupPopup'

export type ReadingTool = 'select' | 'highlight' | 'note' | 'lookup' | 'erase'

type Pending = Omit<Highlight, 'id' | 'note'> & { editId?: string; note: string }

export function ReadingPane({
  content,
  highlights,
  onHighlightsChange,
  tool,
}: {
  content: ReadingContent
  highlights: Highlight[]
  onHighlightsChange: (next: Highlight[]) => void
  tool: ReadingTool
}) {
  const [pendingNote, setPendingNote] = useState<Pending | null>(null)
  const [lookupAt, setLookupAt] = useState<{ text: string; rect: DOMRect } | null>(null)

  const handleMouseUp = () => {
    if (tool === 'select' || tool === 'erase') return
    const selection = window.getSelection()
    const offsets = selectionToOffsets(selection)
    if (!offsets) return
    if (tool === 'lookup') {
      const rect = selection!.getRangeAt(0).getBoundingClientRect()
      setLookupAt({ text: offsets.text, rect })
    } else if (tool === 'highlight') {
      onHighlightsChange(addHighlight(highlights, { id: crypto.randomUUID(), ...offsets }))
      selection?.removeAllRanges()
    } else if (tool === 'note') {
      setPendingNote({
        paragraph: offsets.paragraph,
        start: offsets.start,
        end: offsets.end,
        note: '',
      })
      selection?.removeAllRanges()
    }
  }

  const handleMarkClick = (h: Highlight) => {
    if (tool === 'erase') onHighlightsChange(highlights.filter((x) => x.id !== h.id))
    else if (h.note !== undefined || tool === 'note')
      setPendingNote({ ...h, note: h.note ?? '', editId: h.id })
  }

  const saveNote = () => {
    if (!pendingNote) return
    const { editId, ...rest } = pendingNote
    const note = rest.note.trim()
    if (editId) {
      onHighlightsChange(
        highlights.map((h) => (h.id === editId ? { ...h, note: note || undefined } : h)),
      )
    } else {
      onHighlightsChange(
        addHighlight(highlights, { id: crypto.randomUUID(), ...rest, note: note || undefined }),
      )
    }
    setPendingNote(null)
  }

  return (
    <article
      onMouseUp={handleMouseUp}
      className={cn(
        'mx-auto max-w-3xl leading-relaxed',
        tool === 'highlight' && 'selection:bg-yellow-200',
        tool === 'note' && 'selection:bg-sky-200',
      )}
      style={{ fontSize: 'var(--reading-font-size)' }}
    >
      <h2 className="text-[1.4em] font-bold leading-snug">{content.passageTitle}</h2>
      {content.subtitle && <p className="mt-3 font-semibold">{content.subtitle}</p>}
      <div className="mt-5 space-y-5">
        {content.paragraphs.map((p, i) => (
          <p key={i} className="text-foreground/90">
            {p.label && (
              // A separate, unselectable label so double-clicking the first word never
              // selects "AFor" across the paragraph boundary.
              <>
                <b className="select-none">{p.label}</b>{' '}
              </>
            )}
            <span data-paragraph={i}>
              {segmentText(
                p.text,
                highlights.filter((h) => h.paragraph === i),
              ).map((seg, j) =>
                seg.highlight ? (
                  <mark
                    key={j}
                    title={seg.highlight.note}
                    onClick={() => handleMarkClick(seg.highlight!)}
                    className={cn(
                      'hl',
                      seg.highlight.note && 'hl-note',
                      (tool === 'erase' || seg.highlight.note) && 'cursor-pointer',
                    )}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={j}>{seg.text}</span>
                ),
              )}
            </span>
          </p>
        ))}
      </div>

      <Dialog open={!!pendingNote} onOpenChange={(open) => !open && setPendingNote(null)}>
        <DialogContent title="Ghi chú" description="Ghi chú sẽ được lưu cùng đoạn văn bạn đã chọn.">
          <Textarea
            autoFocus
            value={pendingNote?.note ?? ''}
            onChange={(e) => setPendingNote((p) => (p ? { ...p, note: e.target.value } : p))}
            placeholder="Nhập ghi chú..."
          />
          <div className="mt-4 flex justify-end gap-2">
            {pendingNote?.editId && (
              <Button
                variant="ghost"
                className="mr-auto text-danger"
                onClick={() => {
                  onHighlightsChange(highlights.filter((h) => h.id !== pendingNote.editId))
                  setPendingNote(null)
                }}
              >
                Xóa
              </Button>
            )}
            <Button variant="outline" onClick={() => setPendingNote(null)}>
              Hủy
            </Button>
            <Button onClick={saveNote}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>

      {lookupAt && (
        <LookupPopup text={lookupAt.text} rect={lookupAt.rect} onClose={() => setLookupAt(null)} />
      )}
    </article>
  )
}
