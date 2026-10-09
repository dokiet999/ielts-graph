import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookA,
  Columns2,
  Eraser,
  Highlighter,
  Moon,
  MousePointer2,
  StickyNote,
  Sun,
  Type,
  X,
} from 'lucide-react'
import { LogoMark } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/menu'
import type { Highlight } from '@/lib/highlight'
import {
  isListeningContent,
  isReadingContent,
  type AnswerValue,
  type Answers,
  type Exercise,
  type QuestionResult,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { isAnswered } from '@/stores/session'
import { useSettingsStore } from '@/stores/settings'
import { ListeningPane } from '../listening/ListeningPane'
import { QuestionGroupView } from '../questions/registry'
import { ReadingPane, type ReadingTool } from '../reading/ReadingPane'
import { QuestionNavigator } from './QuestionNavigator'

const TOOLS: { tool: ReadingTool; label: string; icon: typeof Highlighter }[] = [
  { tool: 'select', label: 'Chọn', icon: MousePointer2 },
  { tool: 'highlight', label: 'Highlight', icon: Highlighter },
  { tool: 'note', label: 'Ghi chú', icon: StickyNote },
  { tool: 'erase', label: 'Xóa highlight', icon: Eraser },
  { tool: 'lookup', label: 'Tra nghĩa', icon: BookA },
]

export interface SplitPaneRunnerProps {
  exercise: Exercise
  mode: 'answer' | 'review'
  answers: Answers
  onAnswer?: (questionId: string, value: AnswerValue) => void
  flags?: string[]
  onToggleFlag?: (questionId: string) => void
  highlights: Highlight[]
  onHighlightsChange: (next: Highlight[]) => void
  results?: Record<string, QuestionResult>
  /** Title area, e.g. "Làm bài" + timer. */
  status: React.ReactNode
  /** Footer left label, e.g. "Practice". */
  footerLabel: string
  /** Rendered on the last group instead of the "next" button (submit / back to result). */
  finalAction: React.ReactNode
  onExit: () => void
}

export function SplitPaneRunner({
  exercise,
  mode,
  answers,
  onAnswer,
  flags,
  onToggleFlag,
  highlights,
  onHighlightsChange,
  results,
  status,
  footerLabel,
  finalAction,
  onExit,
}: SplitPaneRunnerProps) {
  const groups = exercise.questionGroups
  const [groupIndex, setGroupIndex] = useState(0)
  const [tool, setTool] = useState<ReadingTool>('select')
  const [leftWidth, setLeftWidth] = useState(50)
  const [mobileTab, setMobileTab] = useState<'passage' | 'questions'>('passage')
  const { dark, toggleDark, cycleFontSize, fontSize } = useSettingsStore()
  const questionsRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pendingScroll = useRef<number | null>(null)

  const content = exercise.content
  const hasPassage = isReadingContent(content) || isListeningContent(content)
  const total = groups.reduce((n, g) => n + g.questions.length, 0)
  const answered = groups
    .flatMap((g) => g.questions)
    .filter((q) => isAnswered(answers[q.id])).length
  const group = groups[groupIndex]
  const nextGroup = groups[groupIndex + 1]

  const jump = (gi: number, questionNumber?: number) => {
    setGroupIndex(gi)
    setMobileTab('questions')
    pendingScroll.current = questionNumber ?? null
    if (questionNumber === undefined) questionsRef.current?.scrollTo({ top: 0 })
  }

  useEffect(() => {
    if (pendingScroll.current === null) return
    document
      .getElementById(`q-${pendingScroll.current}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    pendingScroll.current = null
  }, [groupIndex, mobileTab])

  // Draggable divider between the two panes.
  const startDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const move = (ev: PointerEvent) => {
      const box = containerRef.current?.getBoundingClientRect()
      if (!box) return
      setLeftWidth(Math.min(75, Math.max(25, ((ev.clientX - box.left) / box.width) * 100)))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [])

  const showTools = isReadingContent(content)

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Button variant="outline" size="icon" onClick={onExit} aria-label="Thoát">
          <X />
        </Button>
        <LogoMark className="hidden size-8 sm:block" />
        {showTools && (
          <div
            className="ml-2 hidden items-center gap-1 rounded-xl border p-1 md:flex"
            role="toolbar"
            aria-label="Công cụ đọc"
          >
            {TOOLS.map(({ tool: t, label, icon: Icon }) => (
              <Tooltip key={t} content={label}>
                <button
                  type="button"
                  onClick={() => setTool(t)}
                  aria-pressed={tool === t}
                  aria-label={label}
                  className={cn(
                    'flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors',
                    tool === t ? 'bg-info-soft text-info' : 'hover:bg-muted',
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden xl:inline">{label}</span>
                </button>
              </Tooltip>
            ))}
          </div>
        )}
        <div className="flex min-w-0 flex-1 justify-center">{status}</div>
        <div className="flex items-center gap-1">
          {hasPassage && (
            <Tooltip content="Chia đôi màn hình">
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex"
                onClick={() => setLeftWidth(50)}
                aria-label="Chia đôi màn hình"
              >
                <Columns2 />
              </Button>
            </Tooltip>
          )}
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

      {/* Mobile tab switcher */}
      {hasPassage && (
        <div className="flex border-b lg:hidden" role="tablist">
          {(['passage', 'questions'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={mobileTab === t}
              onClick={() => setMobileTab(t)}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium',
                mobileTab === t
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground',
              )}
            >
              {t === 'passage' ? (isListeningContent(content) ? 'Audio' : 'Bài đọc') : 'Câu hỏi'}
            </button>
          ))}
        </div>
      )}

      {/* Panes */}
      <div ref={containerRef} className="flex min-h-0 flex-1">
        {hasPassage && (
          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto px-5 py-6 lg:block lg:flex-none lg:basis-[var(--left)] lg:px-10',
              mobileTab === 'passage' ? 'block' : 'hidden',
            )}
            style={{ '--left': `${leftWidth}%` } as React.CSSProperties}
          >
            {isReadingContent(content) && (
              <ReadingPane
                content={content}
                highlights={highlights}
                onHighlightsChange={onHighlightsChange}
                tool={tool}
              />
            )}
            {isListeningContent(content) && (
              <ListeningPane
                content={content}
                audioUrl={exercise.audioUrl}
                instruction={exercise.instruction}
                showTranscript={mode === 'review'}
              />
            )}
          </div>
        )}
        {hasPassage && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Kéo để đổi kích thước"
            onPointerDown={startDrag}
            className="group relative hidden w-px shrink-0 cursor-col-resize bg-border lg:block"
          >
            <span className="absolute left-1/2 top-1/2 h-10 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border group-hover:bg-muted-foreground/40" />
          </div>
        )}
        <div
          ref={questionsRef}
          className={cn(
            'min-h-0 flex-1 overflow-y-auto px-5 py-6 lg:block lg:px-10',
            hasPassage && mobileTab !== 'questions' ? 'hidden' : 'block',
          )}
        >
          <div className="mx-auto max-w-3xl">
            {!hasPassage && exercise.instruction && (
              <p className="mb-6 text-muted-foreground">{exercise.instruction}</p>
            )}
            {group && (
              <QuestionGroupView
                key={group.id}
                group={group}
                answers={answers}
                onChange={(qid, v) => onAnswer?.(qid, v)}
                results={results}
                flags={flags}
                onToggleFlag={mode === 'answer' ? onToggleFlag : undefined}
              />
            )}
            <div className="mt-8 flex justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => jump(groupIndex - 1)}
                disabled={groupIndex === 0}
              >
                <ArrowLeft /> Phần trước
              </Button>
              {nextGroup && (
                <Button variant="outline" onClick={() => jump(groupIndex + 1)}>
                  Phần tiếp <ArrowRight />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex shrink-0 flex-col gap-3 border-t bg-surface px-4 py-3 md:flex-row md:items-center">
        <div className="flex items-center justify-between gap-4 md:block md:w-44">
          <div>
            <p className="font-semibold">{footerLabel}</p>
            <p className="text-sm text-muted-foreground">
              Đã làm {answered} / {total}
            </p>
          </div>
          <div className="md:hidden">
            {nextGroup ? (
              <Button onClick={() => jump(groupIndex + 1)}>
                {nextGroup.questionRange} <ArrowRight />
              </Button>
            ) : (
              finalAction
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto">
          <QuestionNavigator
            groups={groups}
            answers={answers}
            flags={flags}
            results={results}
            currentGroup={groupIndex}
            onJump={(gi, n) => jump(gi, n)}
          />
        </div>
        <div className="hidden md:flex md:w-44 md:justify-end">
          {nextGroup ? (
            <Button onClick={() => jump(groupIndex + 1)}>
              {nextGroup.questionRange} <ArrowRight />
            </Button>
          ) : (
            finalAction
          )}
        </div>
      </footer>
    </div>
  )
}
