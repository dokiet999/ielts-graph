/** A highlighted span inside one passage paragraph, stored as character offsets. */
export interface Highlight {
  id: string
  paragraph: number
  start: number
  end: number
  note?: string
}

export interface TextSegment {
  text: string
  highlight?: Highlight
}

/**
 * Adds a highlight, replacing any existing highlight in the same paragraph that overlaps it
 * (overlapping marks would otherwise nest and make offsets ambiguous).
 */
export function addHighlight(list: Highlight[], next: Highlight): Highlight[] {
  if (next.end <= next.start) return list
  const kept = list.filter(
    (h) => h.paragraph !== next.paragraph || h.end <= next.start || h.start >= next.end,
  )
  return [...kept, next]
}

/** Splits paragraph text into plain and highlighted segments, in order. */
export function segmentText(text: string, highlights: Highlight[]): TextSegment[] {
  const sorted = [...highlights]
    .filter((h) => h.start < text.length && h.end > h.start)
    .sort((a, b) => a.start - b.start)
  const segments: TextSegment[] = []
  let cursor = 0
  for (const h of sorted) {
    const start = Math.max(h.start, cursor)
    const end = Math.min(h.end, text.length)
    if (end <= start) continue
    if (start > cursor) segments.push({ text: text.slice(cursor, start) })
    segments.push({ text: text.slice(start, end), highlight: h })
    cursor = end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}

/**
 * Converts the current DOM selection into offsets relative to the paragraph element
 * (an element with a `data-paragraph` attribute). Returns null if the selection is empty
 * or spans more than one paragraph.
 */
export function selectionToOffsets(
  selection: Selection | null,
): { paragraph: number; start: number; end: number; text: string } | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  const startPara = closestParagraph(range.startContainer)
  const endPara = closestParagraph(range.endContainer)
  if (!startPara || startPara !== endPara) return null

  const before = document.createRange()
  before.selectNodeContents(startPara)
  before.setEnd(range.startContainer, range.startOffset)
  const raw = range.toString()
  let start = before.toString().length
  let end = start + raw.length
  // Trim surrounding whitespace so double-click selections do not swallow spaces.
  const leading = raw.length - raw.trimStart().length
  const trailing = raw.length - raw.trimEnd().length
  start += leading
  end -= trailing
  if (end <= start) return null
  return {
    paragraph: Number(startPara.dataset.paragraph),
    start,
    end,
    text: raw.trim(),
  }
}

function closestParagraph(node: Node): HTMLElement | null {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  return (el?.closest('[data-paragraph]') as HTMLElement | null) ?? null
}
