// Raw JSON as returned by the Spring Boot backend (branch feature/reading, plus the endpoints
// listed in the FE↔BE integration doc). Components never use these: lib/adapters.ts turns them
// into the models in lib/types.ts. BigDecimal fields arrive as JSON numbers, but may also be
// strings in some serializers, so adapters always go through Number().

type Num = number | string
type Id = string

export interface BeCourse {
  id: Id
  teacherId: Id
  teacherName: string
  categoryName: string | null
  title: string
  description: string | null
  thumbnail: string | null
  skillFocus: string
  difficultyLevel: string
  estimatedDuration: number | null
  createdAt?: string
  publishedAt?: string | null
}

/** GET /courses/my */
export interface BeMyCourse {
  id: Id
  title: string
  description: string | null
  thumbnail: string | null
  difficultyLevel: string
  skillFocus: string
  categoryName: string | null
  teacherId: Id
  teacherName: string
  estimatedDuration: number | null
  enrolledAt: string
  completedAt: string | null
  sectionCount: number
  exerciseCount: number
  completedExerciseCount: number
}

export interface BeLessonSummary {
  id: Id
  sectionId: Id
  title: string
  lessonType: string
  videoDuration: number | null
  ordering: number
  isPreview?: boolean
  exerciseCount?: number
}

export interface BeSection {
  id: Id
  title: string
  description: string | null
  ordering: number
  lessons: BeLessonSummary[]
  exerciseCount?: number
  completedExerciseCount?: number | null
}

/** GET /courses/{id} */
export interface BeCourseDetail {
  course: BeCourse
  totalLessons: number
  exerciseCount?: number
  completedExerciseCount?: number | null
  enrollment?: { enrolledAt: string; completedAt: string | null } | null
  sections: BeSection[]
}

export interface BeLesson {
  id: Id
  sectionId: Id
  title: string
  lessonType: string
  videoUrl: string | null
  videoDuration: number | null
  documentUrl: string | null
  ordering: number
  isPreview?: boolean
}

export interface BeExerciseSummary {
  id: Id
  title: string
  exerciseType: string
  skillType: string
  timeLimit: number | null
  ordering: number
  lessonId?: Id | null
  lessonTitle?: string | null
  sectionId?: Id | null
  courseId?: Id | null
  questionCount?: number
  maxScore?: Num
  attemptCount?: number
  bestScore?: Num | null
  lastSubmissionId?: Id | null
}

/** GET /lessons/{id} */
export interface BeLessonDetail {
  lesson: BeLesson
  courseId: Id
  courseTitle: string
  sectionId: Id
  sectionTitle: string
  exercises: BeExerciseSummary[]
}

export interface BeOption {
  id: Id
  optionText: string
  ordering: number
  /** Only in the review payload (GET /submissions/{id}/detail). */
  isCorrect?: boolean
}

export interface BeQuestion {
  id: Id
  ordering: number
  questionText: string
  questionType: string
  points: Num
  options: BeOption[]
  /** Only in the review payload. */
  explanation?: string | null
}

export interface BeQuestionGroup {
  id: Id
  groupTitle: string | null
  groupInstruction: string | null
  questionType: string
  questionRange: string | null
  imageUrl?: string | null
  ordering?: number
  questions: BeQuestion[]
}

/** GET /exercises/{id} (practice payload) and the `exercise` of the review payload. */
export interface BeExercise {
  id: Id
  lessonId: Id | null
  sectionId?: Id | null
  courseId?: Id | null
  title: string
  instruction: string | null
  audioUrl: string | null
  content: Record<string, unknown> | null
  exerciseType: string
  skillType: string
  timeLimit: number | null
  maxAttempts: number | null
  questionGroups: BeQuestionGroup[]
}

/** GET /submissions/me */
export interface BeSubmissionSummary {
  id: Id
  exerciseId: Id
  exerciseTitle: string
  skillType: string
  exerciseType: string
  courseId: Id | null
  sectionId?: Id | null
  attemptNumber: number
  status: string
  score: Num
  maxScore: Num
  correctCount: number
  questionCount: number
  timeSpent: number | null
  submittedAt: string
}

/** GET /submissions/{id}/detail */
export interface BeSubmissionDetail extends BeSubmissionSummary {
  /** Choice questions: the option id. FILL_BLANK: the typed text. Speaking/Writing: structured jsonb. */
  answers: Record<string, unknown>
  results: { questionId: Id; correct: boolean; earned: Num }[]
  exercise: BeExercise
  aiStructuredFeedback?: BeWritingFeedback | BeSpeakingFeedback | null
  aiFeedback?: string | null
}

/** POST /exercises/{id}/submit */
export interface BeSubmitResult {
  result: { submissionId: Id }
}

/** One mistake in the raw feedback; the schema calls the fix `suggestion`, older output `comment`. */
export interface BeWritingEvidence {
  quote: string
  error_type: string
  suggestion?: string
  comment?: string
}

/** ai/schema/writing_feedback.schema.json: the JSON the LLM returns, after server-side clean-up. */
export interface BeWritingFeedback {
  schema_version?: string
  task?: string
  overall_band?: Num
  out_of_calibration_range?: boolean
  criteria?: Record<
    string,
    { band: Num; comment?: string; feedback?: string; evidence?: BeWritingEvidence[] }
  >
  summary?: string
  improvements?: string[]
}

/** POST /exercises/{id}/submit/writing */
export interface BeWritingResult {
  submissionId: Id
  exerciseId: Id
  exerciseTitle: string
  attemptNumber: number
  overallBand: Num
  outOfCalibrationRange: boolean | null
  status: string
  timeSpent: number | null
  submittedAt: string
  taskType: string | null
  summary: string | null
  improvements: string[] | null
  aiModel?: string | null
  aiPromptVersion?: string | null
  aiLatencyMs?: number | null
  rawFeedback: BeWritingFeedback | null
}

export interface BeSpeakingFeatures {
  duration_sec?: Num
  word_count?: Num
  speech_rate_wpm?: Num
  pause_count?: Num
  total_pause_sec?: Num
  longest_pause_sec?: Num
}

export interface BeSpeakingPronunciation {
  accuracy?: Num
  fluency?: Num
  completeness?: Num
  prosody?: Num | null
}

/** ai/schema/speaking_feedback.schema.json: the JSON the LLM returns, after server-side clean-up. */
export interface BeSpeakingFeedback {
  schema_version?: string
  part?: string
  overall_band?: Num
  out_of_calibration_range?: boolean
  criteria?: Record<
    string,
    { band: Num; comment?: string; feedback?: string; evidence?: BeWritingEvidence[] }
  >
  summary?: string
  improvements?: string[]
}

/** POST /exercises/{id}/submit/speaking */
export interface BeSpeakingResult {
  submissionId: Id
  exerciseId: Id
  exerciseTitle: string
  attemptNumber: number
  part: string | null
  overallBand: Num
  outOfCalibrationRange: boolean | null
  status: string
  timeSpent: number | null
  submittedAt: string
  transcript: string | null
  features: BeSpeakingFeatures | null
  pronunciation: BeSpeakingPronunciation | null
  summary: string | null
  improvements: string[] | null
  asrModel?: string | null
  aiModel?: string | null
  aiPromptVersion?: string | null
  aiLatencyMs?: number | null
  rawFeedback: BeSpeakingFeedback | null
}
