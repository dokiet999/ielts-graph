import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { PageTitle, SectionLabel } from '@/components/PageHeading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ErrorState, Skeleton } from '@/components/ui/states'
import { errorMessage } from '@/lib/api'
import { CONTENT_STATUS_META } from '@/lib/moderation'
import {
  useReplaceExerciseQuestions,
  useTeacherExerciseDetail,
  useUpdateExercise,
} from '@/lib/queries'
import type {
  ExerciseType,
  QuestionType,
  ReplaceExerciseQuestionsInput,
  SkillType,
  TeacherExerciseDetail,
} from '@/lib/types'
import { SKILL_LABEL } from '@/lib/utils'

const SKILLS: SkillType[] = ['READING', 'LISTENING', 'WRITING', 'SPEAKING']
const EXERCISE_TYPES: ExerciseType[] = ['LESSON', 'PRACTICE', 'MOCK_TEST', 'FINAL_TEST']
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm (MULTIPLE_CHOICE)' },
  { value: 'TRUE_FALSE', label: 'True / False / Not Given' },
  { value: 'FILL_BLANK', label: 'Điền từ (FILL_BLANK)' },
  { value: 'MATCHING', label: 'Nối thông tin (MATCHING)' },
  { value: 'DROPLIST', label: 'Chọn từ danh sách (DROPLIST)' },
  { value: 'ESSAY', label: 'Viết luận (ESSAY)' },
  { value: 'SPEAKING', label: 'Nói (SPEAKING)' },
]
const OBJECTIVE_TYPES = new Set<QuestionType>([
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'MATCHING',
  'DROPLIST',
])

const WRITING_TASKS = [
  { value: 'QT_W2_OPINION', label: 'Opinion (Agree / Disagree)' },
  { value: 'QT_W2_DISCUSSION', label: 'Discussion (Both views & opinion)' },
  { value: 'QT_W2_ADV_DISADV', label: 'Advantages & Disadvantages' },
  { value: 'QT_W2_PROBLEM_SOLUTION', label: 'Problems & Solutions' },
  { value: 'QT_W2_TWO_PART', label: 'Two-part Question' },
]

const SPEAKING_PARTS = [
  { value: 'QT_S_PART1', label: 'Speaking Part 1 — Hỏi đáp ngắn' },
  { value: 'QT_S_PART2', label: 'Speaking Part 2 — Cue Card' },
  { value: 'QT_S_PART3', label: 'Speaking Part 3 — Thảo luận' },
]

interface DraftOption {
  optionText: string
  isCorrect: boolean
}

interface DraftQuestion {
  questionText: string
  questionType: QuestionType
  explanation: string
  points: string
  options: DraftOption[]
}

interface DraftGroup {
  groupTitle: string
  groupInstruction: string
  questionType: QuestionType
  questionRange: string
  questions: DraftQuestion[]
}

interface ParagraphDraft {
  label: string
  text: string
}

interface TranscriptLineDraft {
  speaker: string
  text: string
}

function defaultOptionsForType(type: QuestionType): DraftOption[] {
  if (type === 'TRUE_FALSE') {
    return [
      { optionText: 'TRUE', isCorrect: true },
      { optionText: 'FALSE', isCorrect: false },
      { optionText: 'NOT GIVEN', isCorrect: false },
    ]
  }
  if (type === 'MULTIPLE_CHOICE') {
    return [
      { optionText: 'Phương án A', isCorrect: true },
      { optionText: 'Phương án B', isCorrect: false },
      { optionText: 'Phương án C', isCorrect: false },
      { optionText: 'Phương án D', isCorrect: false },
    ]
  }
  if (type === 'DROPLIST' || type === 'MATCHING') {
    return [
      { optionText: 'Lựa chọn 1', isCorrect: true },
      { optionText: 'Lựa chọn 2', isCorrect: false },
    ]
  }
  if (type === 'FILL_BLANK') {
    return [{ optionText: '', isCorrect: true }]
  }
  return []
}

function makeDefaultQuestion(type: QuestionType): DraftQuestion {
  return {
    questionText: '',
    questionType: type,
    explanation: '',
    points: type === 'ESSAY' || type === 'SPEAKING' ? '9' : '1',
    options: defaultOptionsForType(type),
  }
}

function makeDefaultGroup(skill: SkillType): DraftGroup {
  const defaultType: QuestionType =
    skill === 'WRITING'
      ? 'ESSAY'
      : skill === 'SPEAKING'
        ? 'SPEAKING'
        : 'MULTIPLE_CHOICE'
  return {
    groupTitle:
      defaultType === 'ESSAY'
        ? 'Essay Prompt'
        : defaultType === 'SPEAKING'
          ? 'Speaking Prompt'
          : 'Nhóm câu hỏi mới',
    groupInstruction: '',
    questionType: defaultType,
    questionRange: '',
    questions: [makeDefaultQuestion(defaultType)],
  }
}

function parseInitialGroups(ex: TeacherExerciseDetail): DraftGroup[] {
  return ex.questionGroups.map((g) => {
    const inferredType =
      g.questionType ?? g.questions[0]?.questionType ?? 'MULTIPLE_CHOICE'
    return {
      groupTitle: g.groupTitle ?? '',
      groupInstruction: g.groupInstruction ?? '',
      questionType: inferredType,
      questionRange: g.questionRange ?? '',
      questions: g.questions.map((q) => ({
        questionText: q.questionText,
        questionType: q.questionType,
        explanation: q.explanation ?? '',
        points: String(q.points ?? 1),
        options: q.options.map((o) => ({
          optionText: o.optionText,
          isCorrect: Boolean(o.isCorrect),
        })),
      })),
    }
  })
}

function parseParagraphs(content: Record<string, unknown> | null | undefined): ParagraphDraft[] {
  const raw = content?.paragraphs
  if (!Array.isArray(raw) || raw.length === 0) return [{ label: 'A', text: '' }]
  return raw.map((item, idx) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return {
      label: typeof obj.label === 'string' ? obj.label : String.fromCharCode(65 + idx),
      text: typeof obj.text === 'string' ? obj.text : '',
    }
  })
}

function parseTranscript(content: Record<string, unknown> | null | undefined): TranscriptLineDraft[] {
  const raw = content?.transcript
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const obj = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return {
      speaker: typeof obj.speaker === 'string' ? obj.speaker : '',
      text: typeof obj.text === 'string' ? obj.text : '',
    }
  })
}

export function TeacherExerciseEditorPage() {
  const { exerciseId } = useParams<{ exerciseId: string }>()
  const { data: exercise, isLoading, error, refetch } = useTeacherExerciseDetail(exerciseId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !exercise) {
    return (
      <ErrorState
        message={error ? errorMessage(error) : 'Không tìm thấy bài tập.'}
        onRetry={() => refetch()}
      />
    )
  }

  return <ExerciseEditorBody key={exercise.id} exercise={exercise} />
}

function ExerciseEditorBody({ exercise }: { exercise: TeacherExerciseDetail }) {
  const updateExercise = useUpdateExercise()
  const replaceQuestions = useReplaceExerciseQuestions()

  const isFrozen =
    exercise.courseStatus === 'PENDING_REVIEW' || exercise.lessonStatus === 'PENDING_REVIEW'
  const hasSubmissions = exercise.submissionCount > 0
  const structureLocked = isFrozen || hasSubmissions

  // Settings & content state
  const [title, setTitle] = useState(exercise.title)
  const [skillType, setSkillType] = useState<SkillType>(exercise.skillType)
  const [exerciseType, setExerciseType] = useState<ExerciseType>(exercise.exerciseType)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    exercise.timeLimit && exercise.timeLimit > 0
      ? String(Math.ceil(exercise.timeLimit / 60))
      : '',
  )
  const [maxAttempts, setMaxAttempts] = useState(String(exercise.maxAttempts))
  const [passingScore, setPassingScore] = useState(String(exercise.passingScore))
  const [instruction, setInstruction] = useState(exercise.instruction ?? '')

  // Skill-specific content
  const initialContent = exercise.content ?? {}
  const [passageTitle, setPassageTitle] = useState(
    typeof initialContent.passageTitle === 'string' ? initialContent.passageTitle : '',
  )
  const [passageSubtitle, setPassageSubtitle] = useState(
    typeof initialContent.subtitle === 'string' ? initialContent.subtitle : '',
  )
  const [paragraphs, setParagraphs] = useState<ParagraphDraft[]>(() =>
    parseParagraphs(initialContent),
  )

  const [audioUrl, setAudioUrl] = useState(exercise.audioUrl ?? '')
  const [sectionTitle, setSectionTitle] = useState(
    typeof initialContent.sectionTitle === 'string' ? initialContent.sectionTitle : 'Section 1',
  )
  const [transcript, setTranscript] = useState<TranscriptLineDraft[]>(() =>
    parseTranscript(initialContent),
  )

  const [writingTask, setWritingTask] = useState(
    typeof initialContent.task === 'string' ? initialContent.task : 'QT_W2_DISCUSSION',
  )
  const [speakingPart, setSpeakingPart] = useState(
    typeof initialContent.part === 'string' ? initialContent.part : 'QT_S_PART2',
  )
  const [speakingPrompt, setSpeakingPrompt] = useState(
    typeof initialContent.prompt === 'string' ? initialContent.prompt : '',
  )

  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  // Question builder state
  const [groups, setGroups] = useState<DraftGroup[]>(() => parseInitialGroups(exercise))
  const [questionsFeedback, setQuestionsFeedback] = useState<string | null>(null)
  const [questionsError, setQuestionsError] = useState<string | null>(null)

  const buildContentForSkill = (): Record<string, unknown> => {
    switch (skillType) {
      case 'READING':
        return {
          passageTitle: passageTitle.trim(),
          ...(passageSubtitle.trim() ? { subtitle: passageSubtitle.trim() } : {}),
          paragraphs: paragraphs
            .filter((p) => p.text.trim().length > 0)
            .map((p) => ({
              ...(p.label.trim() ? { label: p.label.trim() } : {}),
              text: p.text.trim(),
            })),
        }
      case 'LISTENING':
        return {
          sectionTitle: sectionTitle.trim() || 'Section 1',
          transcript: transcript
            .filter((line) => line.text.trim().length > 0)
            .map((line) => ({
              speaker: line.speaker.trim() || 'Speaker',
              text: line.text.trim(),
            })),
        }
      case 'WRITING':
        return { task: writingTask }
      case 'SPEAKING':
        return {
          part: speakingPart,
          ...(speakingPrompt.trim() ? { prompt: speakingPrompt.trim() } : {}),
        }
    }
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsFeedback(null)
    setSettingsError(null)
    if (!title.trim()) {
      setSettingsError('Vui lòng nhập tên bài tập.')
      return
    }
    const attemptsNum = Number(maxAttempts)
    if (!Number.isInteger(attemptsNum) || attemptsNum < 1) {
      setSettingsError('Số lần làm tối đa phải là số nguyên >= 1.')
      return
    }
    const timeLimitSec =
      timeLimitMinutes.trim().length > 0 ? Number(timeLimitMinutes.trim()) * 60 : undefined
    if (timeLimitSec !== undefined && (!Number.isFinite(timeLimitSec) || timeLimitSec <= 0)) {
      setSettingsError('Thời gian làm bài phải lớn hơn 0.')
      return
    }

    updateExercise.mutate(
      {
        id: exercise.id,
        body: {
          title: title.trim(),
          instruction: instruction.trim() || undefined,
          audioUrl: skillType === 'LISTENING' ? audioUrl.trim() || undefined : undefined,
          content: buildContentForSkill(),
          exerciseType,
          skillType,
          timeLimit: timeLimitSec,
          maxAttempts: attemptsNum,
          passingScore: Number(passingScore) || 0,
          ordering: exercise.ordering,
        },
      },
      {
        onSuccess: () => setSettingsFeedback('Đã lưu cài đặt và nội dung bài tập.'),
        onError: (err) => setSettingsError(errorMessage(err)),
      },
    )
  }

  const handleSaveQuestions = () => {
    setQuestionsFeedback(null)
    setQuestionsError(null)

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      if (g.questions.length === 0) {
        setQuestionsError(`Nhóm câu hỏi #${gi + 1} cần có ít nhất 1 câu hỏi.`)
        return
      }
      for (let qi = 0; qi < g.questions.length; qi++) {
        const q = g.questions[qi]
        if (!q.questionText.trim()) {
          setQuestionsError(`Nhóm #${gi + 1} - Câu #${qi + 1}: Vui lòng nhập nội dung câu hỏi.`)
          return
        }
        const cleanedOpts = q.options.filter((o) => o.optionText.trim().length > 0)
        if (OBJECTIVE_TYPES.has(q.questionType)) {
          if (cleanedOpts.length < 2) {
            setQuestionsError(
              `Nhóm #${gi + 1} - Câu #${qi + 1}: Cần ít nhất 2 phương án có nội dung.`,
            )
            return
          }
          if (!cleanedOpts.some((o) => o.isCorrect)) {
            setQuestionsError(
              `Nhóm #${gi + 1} - Câu #${qi + 1}: Phải đánh dấu ít nhất 1 đáp án đúng.`,
            )
            return
          }
        } else if (q.questionType === 'FILL_BLANK' && cleanedOpts.length === 0) {
          setQuestionsError(
            `Nhóm #${gi + 1} - Câu #${qi + 1}: Cần ít nhất 1 đáp án chấp nhận.`,
          )
          return
        }
      }
    }

    let nextOrder = 1
    const payload: ReplaceExerciseQuestionsInput = {
      questionGroups: groups.map((g, gi) => ({
        groupTitle: g.groupTitle.trim() || undefined,
        groupInstruction: g.groupInstruction.trim() || undefined,
        questionType: g.questionType,
        questionRange: g.questionRange.trim() || undefined,
        ordering: gi + 1,
        questions: g.questions.map((q) => {
          const cleanedOpts = q.options.filter((o) => o.optionText.trim().length > 0)
          return {
            questionText: q.questionText.trim(),
            questionType: q.questionType,
            explanation: q.explanation.trim() || undefined,
            points: Number(q.points) >= 0 ? Number(q.points) : 1,
            ordering: nextOrder++,
            options: cleanedOpts.map((o, oi) => ({
              optionText: o.optionText.trim(),
              isCorrect: q.questionType === 'FILL_BLANK' ? true : o.isCorrect,
              ordering: oi + 1,
            })),
          }
        }),
      })),
    }

    replaceQuestions.mutate(
      { id: exercise.id, body: payload },
      {
        onSuccess: (updated) => {
          setGroups(parseInitialGroups(updated))
          setQuestionsFeedback(
            `Đã lưu ${updated.totalQuestions} câu hỏi thành công.`,
          )
        },
        onError: (err) => setQuestionsError(errorMessage(err)),
      },
    )
  }

  const updateGroup = (gi: number, updater: (g: DraftGroup) => DraftGroup) => {
    setGroups((prev) => prev.map((g, idx) => (idx === gi ? updater(g) : g)))
  }

  const updateQuestion = (
    gi: number,
    qi: number,
    updater: (q: DraftQuestion) => DraftQuestion,
  ) => {
    updateGroup(gi, (g) => ({
      ...g,
      questions: g.questions.map((q, idx) => (idx === qi ? updater(q) : q)),
    }))
  }

  const lessonMeta = CONTENT_STATUS_META[exercise.lessonStatus]

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/teacher/lessons/${exercise.lessonId}/exercises`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách bài tập ({exercise.lessonTitle})
        </Link>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={lessonMeta.tone}>{lessonMeta.label}</Badge>
          <Badge tone="info">{SKILL_LABEL[exercise.skillType]}</Badge>
          <Badge tone="neutral">{exercise.exerciseType}</Badge>
          <span className="text-xs text-muted-foreground">
            {exercise.courseTitle} · {exercise.sectionTitle}
          </span>
        </div>

        <PageTitle
          title={`Soạn bài tập: ${exercise.title}`}
          subtitle="Chỉnh sửa tài liệu đề bài theo kỹ năng và xây dựng bộ câu hỏi + đáp án chi tiết."
        />
      </div>

      {isFrozen && (
        <div className="flex items-start gap-2.5 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Nội dung đang ở trạng thái <strong>Chờ duyệt</strong> nên tạm thời khóa chỉnh sửa. Hãy
            rút duyệt trước khi cập nhật.
          </span>
        </div>
      )}

      {hasSubmissions && (
        <div className="flex items-start gap-2.5 rounded-xl bg-info-soft px-4 py-3 text-sm text-info">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <span>
            Bài tập này đã có <strong>{exercise.submissionCount} lượt nộp</strong> từ học viên. Bạn
            vẫn có thể cập nhật tiêu đề, hướng dẫn và nội dung mô tả, nhưng cấu trúc câu hỏi, đáp
            án, kỹ năng và loại bài tập đã được khóa để không làm sai lệch điểm số đã chấm.
          </span>
        </div>
      )}

      {/* Panel 1: Settings & Skill Content */}
      <section className="card p-6">
        <SectionLabel>1. Thông tin chung & Nội dung đề bài</SectionLabel>

        <form onSubmit={handleSaveSettings} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên bài tập" htmlFor="ed-title">
              <Input
                id="ed-title"
                disabled={isFrozen}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Kỹ năng" htmlFor="ed-skill">
              <Select
                id="ed-skill"
                disabled={structureLocked}
                value={skillType}
                onChange={(e) => setSkillType(e.target.value as SkillType)}
              >
                {SKILLS.map((sk) => (
                  <option key={sk} value={sk}>
                    {SKILL_LABEL[sk]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Loại bài tập" htmlFor="ed-type">
              <Select
                id="ed-type"
                disabled={structureLocked}
                value={exerciseType}
                onChange={(e) => setExerciseType(e.target.value as ExerciseType)}
              >
                {EXERCISE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Thời gian (phút)" htmlFor="ed-time">
              <Input
                id="ed-time"
                type="number"
                min={1}
                disabled={isFrozen}
                value={timeLimitMinutes}
                onChange={(e) => setTimeLimitMinutes(e.target.value)}
                placeholder="Không giới hạn"
              />
            </Field>
            <Field label="Số lần làm tối đa" htmlFor="ed-attempts">
              <Input
                id="ed-attempts"
                type="number"
                min={1}
                disabled={isFrozen}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(e.target.value)}
              />
            </Field>
            <Field label="Điểm đạt" htmlFor="ed-passing">
              <Input
                id="ed-passing"
                type="number"
                min={0}
                step="0.5"
                disabled={isFrozen}
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Hướng dẫn làm bài" htmlFor="ed-instruction">
            <Textarea
              id="ed-instruction"
              disabled={isFrozen}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ví dụ: Dành khoảng 20 phút đọc đoạn văn và trả lời các câu hỏi bên dưới."
            />
          </Field>

          {skillType === 'READING' && (
            <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Nội dung bài đọc (Reading Passage)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tiêu đề bài đọc" htmlFor="reading-title">
                  <Input
                    id="reading-title"
                    disabled={isFrozen}
                    value={passageTitle}
                    onChange={(e) => setPassageTitle(e.target.value)}
                    placeholder="Farming in the Sky"
                  />
                </Field>
                <Field label="Phụ đề (tùy chọn)" htmlFor="reading-subtitle">
                  <Input
                    id="reading-subtitle"
                    disabled={isFrozen}
                    value={passageSubtitle}
                    onChange={(e) => setPassageSubtitle(e.target.value)}
                  />
                </Field>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Các đoạn văn</span>
                  {!isFrozen && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setParagraphs((prev) => [
                          ...prev,
                          { label: String.fromCharCode(65 + prev.length), text: '' },
                        ])
                      }
                    >
                      <Plus /> Thêm đoạn văn
                    </Button>
                  )}
                </div>
                {paragraphs.map((p, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-[90px_1fr_auto]">
                    <Input
                      aria-label={`Nhãn đoạn ${idx + 1}`}
                      placeholder="A"
                      disabled={isFrozen}
                      value={p.label}
                      onChange={(e) =>
                        setParagraphs((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, label: e.target.value } : item,
                          ),
                        )
                      }
                    />
                    <Textarea
                      aria-label={`Nội dung đoạn ${idx + 1}`}
                      placeholder="Nhập nội dung đoạn văn..."
                      disabled={isFrozen}
                      value={p.text}
                      onChange={(e) =>
                        setParagraphs((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, text: e.target.value } : item,
                          ),
                        )
                      }
                    />
                    {!isFrozen && paragraphs.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Xóa đoạn ${idx + 1}`}
                        onClick={() =>
                          setParagraphs((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="text-danger" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {skillType === 'LISTENING' && (
            <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Nội dung bài nghe (Listening Audio & Transcript)</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="URL file nghe audio" htmlFor="listening-audio">
                  <Input
                    id="listening-audio"
                    disabled={isFrozen}
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://example.com/audio/section1.mp3"
                  />
                </Field>
                <Field label="Tiêu đề phần nghe" htmlFor="listening-section-title">
                  <Input
                    id="listening-section-title"
                    disabled={isFrozen}
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    placeholder="Section 1"
                  />
                </Field>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Transcript (tùy chọn)</span>
                  {!isFrozen && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setTranscript((prev) => [...prev, { speaker: 'Speaker', text: '' }])
                      }
                    >
                      <Plus /> Thêm dòng thoại
                    </Button>
                  )}
                </div>
                {transcript.map((line, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                    <Input
                      aria-label={`Người nói ${idx + 1}`}
                      placeholder="Tom"
                      disabled={isFrozen}
                      value={line.speaker}
                      onChange={(e) =>
                        setTranscript((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, speaker: e.target.value } : item,
                          ),
                        )
                      }
                    />
                    <Input
                      aria-label={`Lời thoại ${idx + 1}`}
                      placeholder="Nội dung câu nói..."
                      disabled={isFrozen}
                      value={line.text}
                      onChange={(e) =>
                        setTranscript((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, text: e.target.value } : item,
                          ),
                        )
                      }
                    />
                    {!isFrozen && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Xóa dòng ${idx + 1}`}
                        onClick={() =>
                          setTranscript((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="text-danger" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {skillType === 'WRITING' && (
            <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Cấu hình chấm điểm AI Writing</p>
              <Field label="Dạng đề Writing Task 2" htmlFor="writing-task">
                <Select
                  id="writing-task"
                  disabled={isFrozen}
                  value={writingTask}
                  onChange={(e) => setWritingTask(e.target.value)}
                >
                  {WRITING_TASKS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}

          {skillType === 'SPEAKING' && (
            <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Cấu hình chấm điểm AI Speaking</p>
              <Field label="Phần thi Speaking" htmlFor="speaking-part">
                <Select
                  id="speaking-part"
                  disabled={isFrozen}
                  value={speakingPart}
                  onChange={(e) => setSpeakingPart(e.target.value)}
                >
                  {SPEAKING_PARTS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Đề bài / Câu hỏi Speaking" htmlFor="speaking-prompt">
                <Textarea
                  id="speaking-prompt"
                  disabled={isFrozen}
                  value={speakingPrompt}
                  onChange={(e) => setSpeakingPrompt(e.target.value)}
                  placeholder="Describe a place you visited recently..."
                />
              </Field>
            </div>
          )}

          {settingsError && (
            <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              {settingsError}
            </p>
          )}
          {settingsFeedback && (
            <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
              <CheckCircle2 className="size-4 shrink-0" /> {settingsFeedback}
            </p>
          )}

          {!isFrozen && (
            <div className="flex justify-end">
              <Button type="submit" loading={updateExercise.isPending}>
                <Save /> Lưu cài đặt & nội dung
              </Button>
            </div>
          )}
        </form>
      </section>

      {/* Panel 2: Question Builder */}
      <section className="space-y-4">
        <SectionLabel
          action={
            !structureLocked && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setGroups((prev) => [...prev, makeDefaultGroup(skillType)])}
              >
                <Plus /> Thêm nhóm câu hỏi
              </Button>
            )
          }
        >
          2. Bộ câu hỏi & Đáp án ({groups.reduce((n, g) => n + g.questions.length, 0)} câu)
        </SectionLabel>

        {groups.length === 0 ? (
          <div className="card flex flex-col items-start gap-3 p-6 text-sm text-muted-foreground">
            <p>Chưa có nhóm câu hỏi nào. Hãy thêm nhóm câu hỏi để soạn đề.</p>
            {!structureLocked && (
              <Button
                type="button"
                size="sm"
                onClick={() => setGroups([makeDefaultGroup(skillType)])}
              >
                <Plus /> Thêm nhóm câu hỏi đầu tiên
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group, gi) => (
              <div key={gi} className="card space-y-5 p-6">
                <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid flex-1 gap-3 sm:grid-cols-3">
                    <Field label="Tiêu đề nhóm" htmlFor={`g-${gi}-title`}>
                      <Input
                        id={`g-${gi}-title`}
                        disabled={structureLocked}
                        value={group.groupTitle}
                        onChange={(e) =>
                          updateGroup(gi, (g) => ({ ...g, groupTitle: e.target.value }))
                        }
                        placeholder="Questions 1-5"
                      />
                    </Field>
                    <Field label="Dạng câu hỏi nhóm" htmlFor={`g-${gi}-type`}>
                      <Select
                        id={`g-${gi}-type`}
                        disabled={structureLocked}
                        value={group.questionType}
                        onChange={(e) =>
                          updateGroup(gi, (g) => ({
                            ...g,
                            questionType: e.target.value as QuestionType,
                          }))
                        }
                      >
                        {QUESTION_TYPES.map((qt) => (
                          <option key={qt.value} value={qt.value}>
                            {qt.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Phạm vi câu (tùy chọn)" htmlFor={`g-${gi}-range`}>
                      <Input
                        id={`g-${gi}-range`}
                        disabled={structureLocked}
                        value={group.questionRange}
                        onChange={(e) =>
                          updateGroup(gi, (g) => ({ ...g, questionRange: e.target.value }))
                        }
                        placeholder="1-5"
                      />
                    </Field>
                  </div>
                  {!structureLocked && (
                    <Button
                      type="button"
                      size="sm"
                      variant="dangerSoft"
                      onClick={() => setGroups((prev) => prev.filter((_, idx) => idx !== gi))}
                    >
                      <Trash2 /> Xóa nhóm
                    </Button>
                  )}
                </div>

                <Field label="Hướng dẫn nhóm câu hỏi" htmlFor={`g-${gi}-inst`}>
                  <Input
                    id={`g-${gi}-inst`}
                    disabled={structureLocked}
                    value={group.groupInstruction}
                    onChange={(e) =>
                      updateGroup(gi, (g) => ({ ...g, groupInstruction: e.target.value }))
                    }
                    placeholder="Choose the correct letter, A, B, C or D."
                  />
                </Field>

                <div className="space-y-4">
                  {group.questions.map((q, qi) => (
                    <div key={qi} className="space-y-3 rounded-xl border bg-muted/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">Câu hỏi #{qi + 1}</span>
                        <div className="flex items-center gap-2">
                          <Select
                            aria-label={`Loại câu ${gi + 1}-${qi + 1}`}
                            disabled={structureLocked}
                            value={q.questionType}
                            onChange={(e) => {
                              const nextType = e.target.value as QuestionType
                              updateQuestion(gi, qi, (old) => ({
                                ...old,
                                questionType: nextType,
                                points:
                                  nextType === 'ESSAY' || nextType === 'SPEAKING'
                                    ? '9'
                                    : old.points,
                                options:
                                  old.options.length > 0 && OBJECTIVE_TYPES.has(nextType)
                                    ? old.options
                                    : defaultOptionsForType(nextType),
                              }))
                            }}
                            className="w-56"
                          >
                            {QUESTION_TYPES.map((qt) => (
                              <option key={qt.value} value={qt.value}>
                                {qt.value}
                              </option>
                            ))}
                          </Select>
                          {!structureLocked && group.questions.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`Xóa câu ${gi + 1}-${qi + 1}`}
                              onClick={() =>
                                updateGroup(gi, (g) => ({
                                  ...g,
                                  questions: g.questions.filter((_, idx) => idx !== qi),
                                }))
                              }
                            >
                              <Trash2 className="text-danger" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                        <Field
                          label="Nội dung câu hỏi"
                          htmlFor={`g-${gi}-q-${qi}-text`}
                        >
                          <Textarea
                            id={`g-${gi}-q-${qi}-text`}
                            disabled={structureLocked}
                            value={q.questionText}
                            onChange={(e) =>
                              updateQuestion(gi, qi, (old) => ({
                                ...old,
                                questionText: e.target.value,
                              }))
                            }
                            placeholder="Nhập nội dung câu hỏi..."
                          />
                        </Field>
                        <Field label="Điểm" htmlFor={`g-${gi}-q-${qi}-pts`}>
                          <Input
                            id={`g-${gi}-q-${qi}-pts`}
                            type="number"
                            min={0}
                            step="0.5"
                            disabled={structureLocked}
                            value={q.points}
                            onChange={(e) =>
                              updateQuestion(gi, qi, (old) => ({ ...old, points: e.target.value }))
                            }
                          />
                        </Field>
                      </div>

                      {OBJECTIVE_TYPES.has(q.questionType) && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Phương án lựa chọn (tích chọn đáp án đúng)
                            </span>
                            {!structureLocked && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateQuestion(gi, qi, (old) => ({
                                    ...old,
                                    options: [
                                      ...old.options,
                                      { optionText: '', isCorrect: false },
                                    ],
                                  }))
                                }
                              >
                                <Plus /> Thêm phương án
                              </Button>
                            )}
                          </div>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                aria-label={`Đáp án đúng ${gi + 1}-${qi + 1}-${oi + 1}`}
                                disabled={structureLocked}
                                checked={opt.isCorrect}
                                onChange={(e) =>
                                  updateQuestion(gi, qi, (old) => ({
                                    ...old,
                                    options: old.options.map((o, idx) =>
                                      idx === oi ? { ...o, isCorrect: e.target.checked } : o,
                                    ),
                                  }))
                                }
                                className="size-4 shrink-0 accent-primary"
                              />
                              <Input
                                aria-label={`Phương án ${gi + 1}-${qi + 1}-${oi + 1}`}
                                disabled={structureLocked}
                                value={opt.optionText}
                                onChange={(e) =>
                                  updateQuestion(gi, qi, (old) => ({
                                    ...old,
                                    options: old.options.map((o, idx) =>
                                      idx === oi ? { ...o, optionText: e.target.value } : o,
                                    ),
                                  }))
                                }
                                placeholder={`Phương án ${oi + 1}`}
                              />
                              {!structureLocked && q.options.length > 2 && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    updateQuestion(gi, qi, (old) => ({
                                      ...old,
                                      options: old.options.filter((_, idx) => idx !== oi),
                                    }))
                                  }
                                >
                                  <Trash2 className="text-danger" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {q.questionType === 'FILL_BLANK' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Các đáp án được chấp nhận
                            </span>
                            {!structureLocked && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  updateQuestion(gi, qi, (old) => ({
                                    ...old,
                                    options: [
                                      ...old.options,
                                      { optionText: '', isCorrect: true },
                                    ],
                                  }))
                                }
                              >
                                <Plus /> Thêm đáp án chấp nhận
                              </Button>
                            )}
                          </div>
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-2">
                              <Input
                                aria-label={`Đáp án điền từ ${gi + 1}-${qi + 1}-${oi + 1}`}
                                disabled={structureLocked}
                                value={opt.optionText}
                                onChange={(e) =>
                                  updateQuestion(gi, qi, (old) => ({
                                    ...old,
                                    options: old.options.map((o, idx) =>
                                      idx === oi
                                        ? { ...o, optionText: e.target.value, isCorrect: true }
                                        : o,
                                    ),
                                  }))
                                }
                                placeholder="Nhập từ/số đúng..."
                              />
                              {!structureLocked && q.options.length > 1 && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    updateQuestion(gi, qi, (old) => ({
                                      ...old,
                                      options: old.options.filter((_, idx) => idx !== oi),
                                    }))
                                  }
                                >
                                  <Trash2 className="text-danger" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <Field
                        label="Giải thích đáp án (tùy chọn)"
                        htmlFor={`g-${gi}-q-${qi}-exp`}
                      >
                        <Input
                          id={`g-${gi}-q-${qi}-exp`}
                          disabled={structureLocked}
                          value={q.explanation}
                          onChange={(e) =>
                            updateQuestion(gi, qi, (old) => ({
                              ...old,
                              explanation: e.target.value,
                            }))
                          }
                          placeholder="Ví dụ: Paragraph B nêu rõ..."
                        />
                      </Field>
                    </div>
                  ))}

                  {!structureLocked && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateGroup(gi, (g) => ({
                          ...g,
                          questions: [...g.questions, makeDefaultQuestion(g.questionType)],
                        }))
                      }
                    >
                      <Plus /> Thêm câu hỏi vào nhóm
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {questionsError && (
          <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {questionsError}
          </p>
        )}
        {questionsFeedback && (
          <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-sm text-success">
            <CheckCircle2 className="size-4 shrink-0" /> {questionsFeedback}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={structureLocked}
            loading={replaceQuestions.isPending}
            onClick={handleSaveQuestions}
          >
            <Save /> Lưu bộ câu hỏi
          </Button>
        </div>
      </section>
    </div>
  )
}
