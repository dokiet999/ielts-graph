import { ArrowLeft, ArrowRight, CircleHelp, Clock, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Exercise, QuestionType, SkillType } from '@/lib/types'

const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  TRUE_FALSE: 'True / False / Not given',
  FILL_BLANK: 'Summary, Note Completion',
  MULTIPLE_CHOICE: 'Multiple Choice',
  MATCHING: 'Matching Information / Headings',
  DROPLIST: 'Matching / Selection',
  ESSAY: 'Essay (Task 2)',
  SPEAKING: 'Speaking Cue Card / Discussion',
}

const SKILL_ICON: Record<SkillType, string> = {
  READING: '📖',
  LISTENING: '🎧',
  WRITING: '✍️',
  SPEAKING: '🎙️',
}

const INSTRUCTIONS_BY_SKILL: Record<SkillType, string[]> = {
  READING: [
    'Bạn sẽ đọc đoạn văn và trả lời câu hỏi, có thể di chuyển qua lại giữa các câu hỏi.',
    'Một câu hỏi có thể có một hoặc nhiều đáp án tùy theo yêu cầu, có thể thay đổi câu trả lời trong quá trình làm bài.',
    'Ở chế độ thi thật: Bài thi sẽ có thời gian làm bài theo quy định. Bạn có thể nộp bài sớm hoặc sử dụng thêm 10 phút nếu cần.',
  ],
  LISTENING: [
    'Bạn sẽ nghe đoạn băng âm thanh và trả lời câu hỏi, có thể di chuyển qua lại giữa các câu hỏi.',
    'Một câu hỏi có thể có một hoặc nhiều đáp án tùy theo yêu cầu, có thể thay đổi câu trả lời trong quá trình làm bài.',
    'Ở chế độ thi thật: Bài thi sẽ có thời gian làm bài theo quy định. Hãy kiểm tra kỹ chính tả trước khi nộp bài.',
  ],
  WRITING: [
    'Bạn sẽ đọc đề bài nghị luận và viết bài luận vào khung soạn thảo, hệ thống tự động đếm số từ và lưu nháp liên tục.',
    'Bài viết cần đảm bảo tối thiểu 250 từ và giải quyết đầy đủ các yêu cầu trong đề bài.',
    'Ở chế độ thi thật: Bài thi sẽ có thời gian làm bài theo quy định. Sau khi nộp bài, AI sẽ chấm điểm chi tiết theo 4 tiêu chí IELTS Writing.',
  ],
  SPEAKING: [
    'Bạn sẽ đọc câu hỏi chủ đề và ghi âm trực tiếp bằng micro hoặc tải lên file âm thanh câu trả lời.',
    'Bạn có thể nghe lại bản thu âm và ghi âm lại nếu muốn trước khi nhấn nộp bài.',
    'Ở chế độ thi thật: Hãy trả lời mạch lạc trong thời gian quy định. Sau khi nộp bài, AI sẽ phân tích giọng nói và chấm theo 4 tiêu chí IELTS Speaking.',
  ],
}

function describeQuestionTypes(exercise: Exercise): string {
  if (exercise.skillType === 'WRITING') {
    return 'IELTS Writing Task 2 (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy)'
  }
  if (exercise.skillType === 'SPEAKING') {
    return 'IELTS Speaking (Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation)'
  }
  const seen = new Set<string>()
  for (const group of exercise.questionGroups) {
    const label = QUESTION_TYPE_LABEL[group.questionType]
    if (label) seen.add(label)
  }
  return seen.size > 0 ? Array.from(seen).join(', ') : 'Trắc nghiệm & Điền từ'
}

function describeStructure(exercise: Exercise, totalQuestions: number) {
  const minutes = exercise.timeLimit ? Math.round(exercise.timeLimit / 60) : null
  const timeSuffix = minutes ? `, thời gian làm bài là ${minutes} phút` : ''

  switch (exercise.skillType) {
    case 'READING':
      return {
        countMeta: `${totalQuestions} câu hỏi`,
        unitMeta: '1 đoạn văn',
        summaryBullet: `Bài test này bao gồm ${totalQuestions} câu hỏi thuộc 1 đoạn văn${timeSuffix}.`,
      }
    case 'LISTENING':
      return {
        countMeta: `${totalQuestions} câu hỏi`,
        unitMeta: '1 bài nghe',
        summaryBullet: `Bài test này bao gồm ${totalQuestions} câu hỏi thuộc 1 bài nghe${timeSuffix}.`,
      }
    case 'WRITING':
      return {
        countMeta: '1 đề bài viết',
        unitMeta: 'Tối thiểu 250 từ',
        summaryBullet: `Bài test này bao gồm 1 đề bài Writing Task 2 (tối thiểu 250 từ)${timeSuffix}.`,
      }
    case 'SPEAKING':
      return {
        countMeta: '1 chủ đề nói',
        unitMeta: 'Ghi âm trả lời',
        summaryBullet: `Bài test này bao gồm 1 chủ đề nói IELTS Speaking${timeSuffix}.`,
      }
  }
}

export interface TestIntroScreenProps {
  exercise: Exercise
  totalQuestions: number
  hasProgress?: boolean
  onStart: () => void
  onExit: () => void
}

export function TestIntroScreen({
  exercise,
  totalQuestions,
  hasProgress = false,
  onStart,
  onExit,
}: TestIntroScreenProps) {
  const minutes = exercise.timeLimit ? Math.round(exercise.timeLimit / 60) : null
  const { countMeta, unitMeta, summaryBullet } = describeStructure(exercise, totalQuestions)
  const instructions = INSTRUCTIONS_BY_SKILL[exercise.skillType]
  const questionTypesText = describeQuestionTypes(exercise)

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-16 items-center px-4 lg:px-8">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <ArrowLeft className="size-4" /> Quay lại
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 pb-16 pt-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <span aria-hidden="true" className="text-2xl">
              {SKILL_ICON[exercise.skillType]}
            </span>
            <span>{exercise.title}</span>
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CircleHelp className="size-4" />
              {countMeta}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="size-4" />
              {unitMeta}
            </span>
            {minutes !== null && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {minutes} phút
                </span>
              </>
            )}
          </div>

          <hr className="my-6 border-border" />

          <section>
            <h2 className="text-base font-bold text-foreground">Hướng dẫn làm bài</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/85">
              {instructions.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
              {exercise.exerciseType === 'FINAL_TEST' && (
                <li className="font-medium text-danger">
                  Đối với bài Final test cuối khóa: Thời gian được tính liên tục kể từ lúc nhấn Bắt
                  đầu. Nếu thoát ra ngoài, bài làm vẫn được lưu nhưng đồng hồ vẫn tiếp tục đếm ngược.
                </li>
              )}
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-base font-bold text-foreground">Thông tin bài test</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/85">
              <li>{summaryBullet}</li>
              <li>Các dạng câu hỏi có trong bài test: {questionTypesText}</li>
            </ul>
          </section>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={onStart}
              className="rounded-full px-6 py-2.5 text-sm font-semibold shadow-sm"
            >
              {hasProgress ? 'Tiếp tục làm bài' : 'Bắt đầu'} <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

