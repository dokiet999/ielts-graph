import { describe, expect, it } from 'vitest'
import { addHighlight, segmentText, selectionToOffsets, type Highlight } from './highlight'

const h = (id: string, paragraph: number, start: number, end: number): Highlight => ({
  id,
  paragraph,
  start,
  end,
})

describe('addHighlight', () => {
  it('replaces overlapping highlights in the same paragraph only', () => {
    const list = [h('a', 0, 0, 5), h('b', 0, 10, 15), h('c', 1, 0, 5)]
    const next = addHighlight(list, h('d', 0, 3, 12))
    expect(next.map((x) => x.id).sort()).toEqual(['c', 'd'])
  })

  it('keeps adjacent highlights and ignores empty ranges', () => {
    const list = [h('a', 0, 0, 5)]
    expect(addHighlight(list, h('b', 0, 5, 8))).toHaveLength(2)
    expect(addHighlight(list, h('c', 0, 4, 4))).toBe(list)
  })
})

describe('segmentText', () => {
  it('splits text into plain and highlighted segments in order', () => {
    const segments = segmentText('Hello brave new world', [h('b', 0, 12, 15), h('a', 0, 6, 11)])
    expect(segments.map((s) => [s.text, s.highlight?.id])).toEqual([
      ['Hello ', undefined],
      ['brave', 'a'],
      [' ', undefined],
      ['new', 'b'],
      [' world', undefined],
    ])
  })

  it('clamps highlights that run past the end of the text', () => {
    expect(segmentText('short', [h('a', 0, 2, 50)]).map((s) => s.text)).toEqual(['sh', 'ort'])
  })
})

describe('selectionToOffsets', () => {
  it('measures the selection relative to its paragraph and trims spaces', () => {
    document.body.innerHTML =
      '<p><b>A</b> <span data-paragraph="2">Cities have <mark>long</mark> been seen</span></p>'
    const span = document.querySelector('[data-paragraph]')!
    const tail = span.lastChild! // " been seen"
    const range = document.createRange()
    range.setStart(span.firstChild!, 6) // inside "Cities have "
    range.setEnd(tail, 5) // " been"
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    expect(selectionToOffsets(selection)).toEqual({
      paragraph: 2,
      start: 7,
      end: 21,
      text: 'have long been',
    })
  })

  it('rejects selections spanning two paragraphs', () => {
    document.body.innerHTML =
      '<span data-paragraph="0">first</span><span data-paragraph="1">second</span>'
    const [a, b] = document.querySelectorAll('[data-paragraph]')
    const range = document.createRange()
    range.setStart(a.firstChild!, 1)
    range.setEnd(b.firstChild!, 2)
    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)
    expect(selectionToOffsets(selection)).toBeNull()
  })
})
