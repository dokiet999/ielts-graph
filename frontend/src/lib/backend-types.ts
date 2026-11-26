// Raw JSON as returned by the Spring Boot backend (branch feature/reading, plus the endpoints
// listed in the FE↔BE integration doc). Components never use these: lib/adapters.ts turns them
// into the models in lib/types.ts. BigDecimal fields arrive as JSON numbers, but may also be
// strings in some serializers, so adapters always go through Number().

type Num = number | string
type Id = string

export interface BeMetadata {
  code: number
  page?: number
  size?: number
  total?: number
}

export interface BeBaseResponse<T> {
  meta: BeMetadata
  data: T
}

export interface BeUser {
  id: Id
  username?: string | null
  email: string
  fullName: string
  avatarUrl?: string | null
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  status?: 'PENDING' | 'ACTIVE' | 'LOCKED'
  bio?: string | null
  phone?: string | null
  isActive?: boolean
  lockReason?: string | null
}

export interface BeTeacherAccount {
  id: Id
  username: string
  email: string
  fullName: string
  phone?: string | null
  bio?: string | null
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  status: 'PENDING' | 'ACTIVE' | 'LOCKED'
  isActive: boolean
  emailVerified: boolean
  lockReason?: string | null
  courseCount?: number
  createdAt: string
  updatedAt: string
  temporaryPassword?: string | null
}

export interface BeCategory {
  id: Id
  name: string
  slug: string
  description?: string | null
  iconUrl?: string | null
  isActive: boolean
  ordering: number
  courseCount: number
  createdAt: string
  updatedAt: string
}

export interface BeStudentAccount {
  id: Id
  username: string
  email: string
  fullName: string
  phone?: string | null
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  status: 'PENDING' | 'ACTIVE' | 'LOCKED'
  isActive: boolean
  emailVerified: boolean
  lockReason?: string | null
  enrollmentCount: number
  createdAt: string
  updatedAt: string
}

export interface BeAdminCourseSummary {
  id: Id
  title: string
  description?: string | null
  thumbnail?: string | null
  teacherId: Id
  teacherName: string
  categoryId?: Id | null
  categoryName?: string | null
  skillFocus?: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | null
  difficultyLevel?:
    | 'BEGINNER'
    | 'ELEMENTARY'
    | 'INTERMEDIATE'
    | 'UPPER_INTERMEDIATE'
    | 'ADVANCED'
    | null
  estimatedDuration?: number | null
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
  isFeatured: boolean
  isActive: boolean
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  publishedAt?: string | null
  submittedAt?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
  deactivationReason?: string | null
  totalLessons: number
  enrollmentCount: number
  createdAt: string
  updatedAt: string
}

export interface BeReviewQueueItem {
  id: Id
  title: string
  teacherName: string
  skillFocus?: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | null
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  submittedAt: string | null
  waitingDays: number
  reviewedAt?: string | null
  reviewNote?: string | null
  pendingLessonCount?: number | null
  courseId?: Id | null
  courseTitle?: string | null
  sectionId?: Id | null
  sectionTitle?: string | null
  lessonType?: string | null
}

export interface BeAdminLesson {
  id: Id
  sectionId: Id
  title: string
  lessonType: string
  videoUrl?: string | null
  videoDuration?: number | null
  documentUrl?: string | null
  ordering: number
  isPreview: boolean
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  exerciseCount?: number
  submittedAt?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
}

export interface BeAdminSection {
  id: Id
  title: string
  description?: string | null
  ordering: number
  lessons: BeAdminLesson[]
}

export interface BeAdminCourseDetail {
  id: Id
  title: string
  description?: string | null
  thumbnail?: string | null
  teacherId: Id
  teacherName: string
  categoryId?: Id | null
  categoryName?: string | null
  skillFocus?: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | null
  difficultyLevel?:
    | 'BEGINNER'
    | 'ELEMENTARY'
    | 'INTERMEDIATE'
    | 'UPPER_INTERMEDIATE'
    | 'ADVANCED'
    | null
  estimatedDuration?: number | null
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
  enrollmentCount?: number
  isFeatured: boolean
  isActive: boolean
  publishedAt?: string | null
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  submittedAt?: string | null
  reviewedAt?: string | null
  reviewedById?: Id | null
  reviewedByName?: string | null
  reviewNote?: string | null
  deactivationReason?: string | null
  createdAt: string
  updatedAt: string
  totalLessons: number
  sections: BeAdminSection[]
}

export interface BeTeacherCourseSummary {
  id: Id
  title: string
  description?: string | null
  skillFocus?: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | null
  difficultyLevel?:
    | 'BEGINNER'
    | 'ELEMENTARY'
    | 'INTERMEDIATE'
    | 'UPPER_INTERMEDIATE'
    | 'ADVANCED'
    | null
  categoryId?: Id | null
  categoryName?: string | null
  thumbnail?: string | null
  estimatedDuration?: number | null
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
  enrollmentCount?: number
  status: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  submittedAt?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
  deactivationReason?: string | null
  publishedAt?: string | null
  isActive: boolean
  totalLessons: number
  pendingLessonCount: number
  createdAt: string
  updatedAt: string
}

export interface BeTeacherExerciseSummary {
  id: Id
  lessonId: Id
  title: string
  instruction?: string | null
  audioUrl?: string | null
  exerciseType: 'LESSON' | 'MOCK_TEST' | 'PRACTICE' | 'FINAL_TEST'
  skillType: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING'
  timeLimit?: number | null
  maxAttempts: number
  passingScore: Num
  ordering: number
  questionCount: number
  submissionCount: number
  createdAt: string
  updatedAt: string
}

export interface BeTeacherLessonExercises {
  lessonId: Id
  lessonTitle: string
  lessonStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  sectionId: Id
  sectionTitle: string
  courseId: Id
  courseTitle: string
  courseStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  courseSkillFocus?: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING' | null
  exercises: BeTeacherExerciseSummary[]
}

export interface BeTeacherQuestionOption {
  id?: Id
  optionText: string
  isCorrect: boolean
  point?: Num
  explanation?: string | null
  ordering?: number
}

export interface BeTeacherQuestion {
  id?: Id
  questionText: string
  questionType:
    | 'MULTIPLE_CHOICE'
    | 'DROPLIST'
    | 'FILL_BLANK'
    | 'TRUE_FALSE'
    | 'MATCHING'
    | 'ESSAY'
    | 'SPEAKING'
  imageUrl?: string | null
  audioUrl?: string | null
  readingPassage?: string | null
  explanation?: string | null
  points: Num
  ordering?: number
  options: BeTeacherQuestionOption[]
}

export interface BeTeacherQuestionGroup {
  id?: Id | null
  groupTitle?: string | null
  groupInstruction?: string | null
  passageReference?: string | null
  imageUrl?: string | null
  questionType?:
    | 'MULTIPLE_CHOICE'
    | 'DROPLIST'
    | 'FILL_BLANK'
    | 'TRUE_FALSE'
    | 'MATCHING'
    | 'ESSAY'
    | 'SPEAKING'
    | null
  questionRange?: string | null
  ordering?: number
  questions: BeTeacherQuestion[]
}

export interface BeTeacherExerciseDetail {
  id: Id
  lessonId: Id
  lessonTitle: string
  lessonStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  sectionId: Id
  sectionTitle: string
  courseId: Id
  courseTitle: string
  courseStatus: 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  title: string
  instruction?: string | null
  audioUrl?: string | null
  content?: Record<string, unknown> | null
  exerciseType: 'LESSON' | 'MOCK_TEST' | 'PRACTICE' | 'FINAL_TEST'
  skillType: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING'
  timeLimit?: number | null
  maxAttempts: number
  passingScore: Num
  ordering: number
  submissionCount: number
  totalQuestions: number
  questionGroups: BeTeacherQuestionGroup[]
  createdAt: string
  updatedAt: string
}

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
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
  enrollmentCount?: number
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
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
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

export interface BeFinalTestSession {
  sessionId: Id
  exerciseId: Id
  startedAt: string
  expiresAt: string
  remainingSeconds: number
}

export interface BeFinalTestStatus {
  exercise: BeExerciseSummary | null
  unlocked: boolean
  grantExpired: boolean
  deadlineDays: number | null
  unlockedAt: string | null
  grantExpiresAt: string | null
  activeSession: BeFinalTestSession | null
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
  aiScore?: Num | null
  teacherScore?: Num | null
  teacherFeedback?: string | null
  gradingMethod?: 'AI' | 'TEACHER' | null
  gradedByName?: string | null
  gradedAt?: string | null
  correctCount: number
  questionCount: number
  bandScore?: Num | null
  timeSpent: number | null
  submittedAt: string
}

/** GET /submissions/{id}/detail */
export interface BeSubmissionDetail extends BeSubmissionSummary {
  studentId?: Id | null
  studentName?: string | null
  studentEmail?: string | null
  /** Choice questions: the option id. FILL_BLANK: the typed text. Speaking/Writing: structured jsonb. */
  answers: Record<string, unknown>
  results: { questionId: Id; correct: boolean; earned: Num }[]
  exercise: BeExercise
  aiStructuredFeedback?: BeWritingFeedback | BeSpeakingFeedback | null
  aiFeedback?: string | null
}

/** POST /exercises/{id}/submit */
export interface BeSubmitResult {
  result: { submissionId: Id; bandScore?: Num | null }
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

export interface BeCourseStudentProgressItem {
  studentId: Id
  fullName: string
  username: string
  email: string
  enrolledAt: string
  completedAt: string | null
  completedExercises: number
  totalExercises: number
  progressPercent: number
  averageScore: number | null
  totalSubmissions: number
  pendingReviewCount: number
  lastSubmittedAt: string | null
  scheduleStatus: string
}

export interface BeCourseProgressOverview {
  courseId: Id
  courseTitle: string
  maxStudents: number | null
  activeStudentCount: number
  startDate: string | null
  endDate: string | null
  totalExercises: number
  averageProgressPercent: number
  completedCount: number
  behindOrInactiveCount: number
  preEnrolledCount: number
  students: BeCourseStudentProgressItem[]
}

export interface BeSectionFinalTestProgress {
  exerciseId: Id
  exerciseTitle: string
  unlocked: boolean
  grantExpired: boolean
  deadlineDays: number | null
  unlockedAt: string | null
  grantExpiresAt: string | null
  attemptCount: number
  bestScore: Num | null
  latestSubmissionId: Id | null
}

export interface BeExerciseProgressItem {
  exerciseId: Id
  title: string
  exerciseType: string
  skillType: string
  questionCount: number
  maxScore: Num
  attemptCount: number
  bestScore: Num | null
  completed: boolean
  latestSubmissionId: Id | null
  latestStatus: string | null
  lastSubmittedAt: string | null
  hasTeacherFeedback: boolean
}

export interface BeLessonProgressItem {
  lessonId: Id
  title: string
  lessonType: string
  ordering: number
  completedExercises: number
  totalExercises: number
  exercises: BeExerciseProgressItem[]
}

export interface BeSectionProgressItem {
  sectionId: Id
  title: string
  ordering: number
  completedExercises: number
  totalExercises: number
  finalTest: BeSectionFinalTestProgress | null
  lessons: BeLessonProgressItem[]
}

export interface BeStudentSubmissionHistoryItem {
  id: Id
  exerciseId: Id
  exerciseTitle: string
  skillType: string
  exerciseType: string
  attemptNumber: number
  status: string
  score: Num
  maxScore: Num
  aiScore: Num | null
  teacherScore: Num | null
  teacherFeedback: string | null
  gradingMethod: 'AI' | 'TEACHER' | null
  gradedByName: string | null
  gradedAt: string | null
  submittedAt: string
  timeSpent: number | null
}

export interface BeStudentCourseProgressDetail {
  courseId: Id
  courseTitle: string
  startDate: string | null
  endDate: string | null
  maxStudents: number | null
  studentId: Id
  fullName: string
  username: string
  email: string
  enrolledAt: string
  completedAt: string | null
  completedExercises: number
  totalExercises: number
  progressPercent: number
  averageScore: number | null
  lastSubmittedAt: string | null
  scheduleStatus: string
  sections: BeSectionProgressItem[]
  submissions: BeStudentSubmissionHistoryItem[]
}
