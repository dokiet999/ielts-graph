// Types mirror the backend schema (db/migration/V1__init_schema.sql) and enums in
// com.ielts.backend.enums. Replace with types generated from /v3/api-docs once the API exists.

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN'
export type UserStatus = 'PENDING' | 'ACTIVE' | 'LOCKED'
export type ContentStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
export type SkillType = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING'
export type ExerciseType = 'LESSON' | 'MOCK_TEST' | 'PRACTICE' | 'FINAL_TEST'
export type DifficultyLevel =
  'BEGINNER' | 'ELEMENTARY' | 'INTERMEDIATE' | 'UPPER_INTERMEDIATE' | 'ADVANCED'
export type QuestionType =
  'MULTIPLE_CHOICE' | 'DROPLIST' | 'FILL_BLANK' | 'TRUE_FALSE' | 'MATCHING' | 'ESSAY' | 'SPEAKING'
export type SubmissionStatus = 'PENDING' | 'GRADING' | 'GRADED' | 'FAILED'
export type GradingMethod = 'AI' | 'TEACHER'
export type ScheduleStatus = 'COMPLETED' | 'PRE_ENROLLED' | 'BEHIND' | 'INACTIVE' | 'ON_TRACK'

export interface User {
  id: string
  username?: string
  email: string
  fullName: string
  avatarUrl?: string | null
  bio?: string | null
  phone?: string | null
  role: Role
  status?: UserStatus
}

export interface PagedResult<T> {
  items: T[]
  page: number
  size: number
  total: number
  totalPages: number
}

export interface TeacherAccount {
  id: string
  username: string
  email: string
  fullName: string
  phone?: string | null
  bio?: string | null
  role: Role
  status: UserStatus
  isActive: boolean
  emailVerified: boolean
  lockReason?: string | null
  courseCount?: number
  createdAt: string
  updatedAt: string
  temporaryPassword?: string | null
}

export interface CreateTeacherInput {
  username: string
  email: string
  fullName: string
  phone?: string
  bio?: string
  password?: string
}

export interface UpdateTeacherInput {
  email: string
  fullName: string
  phone?: string
  bio?: string
}

export interface Category {
  id: string
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

export interface CategoryInput {
  name: string
  slug?: string
  description?: string
  iconUrl?: string
  isActive: boolean
  ordering: number
}

export interface StudentAccount {
  id: string
  username: string
  email: string
  fullName: string
  phone?: string | null
  role: Role
  status: UserStatus
  isActive: boolean
  emailVerified: boolean
  lockReason?: string | null
  enrollmentCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminCourseSummary {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  teacherId: string
  teacherName: string
  categoryId?: string | null
  categoryName?: string | null
  skillFocus?: SkillType | null
  difficultyLevel?: DifficultyLevel | null
  estimatedDuration?: number | null
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
  isFeatured: boolean
  isActive: boolean
  status: ContentStatus
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

export interface ReviewQueueItem {
  id: string
  title: string
  teacherName: string
  skillFocus?: SkillType | null
  status: ContentStatus
  submittedAt: string | null
  waitingDays: number
  reviewedAt?: string | null
  reviewNote?: string | null
  pendingLessonCount?: number | null
  courseId?: string | null
  courseTitle?: string | null
  sectionId?: string | null
  sectionTitle?: string | null
  lessonType?: string | null
}

export interface AdminLessonItem {
  id: string
  sectionId: string
  title: string
  lessonType: string
  videoUrl?: string | null
  videoDuration?: number | null
  documentUrl?: string | null
  ordering: number
  isPreview: boolean
  status: ContentStatus
  exerciseCount?: number
  submittedAt?: string | null
  reviewedAt?: string | null
  reviewNote?: string | null
}

export interface AdminSectionItem {
  id: string
  title: string
  description?: string | null
  ordering: number
  lessons: AdminLessonItem[]
}

export interface AdminCourseDetail {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  teacherId: string
  teacherName: string
  categoryId?: string | null
  categoryName?: string | null
  skillFocus?: SkillType | null
  difficultyLevel?: DifficultyLevel | null
  estimatedDuration?: number | null
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
  enrollmentCount?: number
  isFeatured: boolean
  isActive: boolean
  publishedAt?: string | null
  status: ContentStatus
  submittedAt?: string | null
  reviewedAt?: string | null
  reviewedById?: string | null
  reviewedByName?: string | null
  reviewNote?: string | null
  deactivationReason?: string | null
  createdAt: string
  updatedAt: string
  totalLessons: number
  sections: AdminSectionItem[]
}

export interface TeacherCourseSummary {
  id: string
  title: string
  description?: string | null
  skillFocus?: SkillType | null
  difficultyLevel?: DifficultyLevel | null
  categoryId?: string | null
  categoryName?: string | null
  thumbnail?: string | null
  estimatedDuration?: number | null
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
  enrollmentCount?: number
  status: ContentStatus
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

export interface TeacherCourseInput {
  categoryId: string
  title: string
  description?: string
  thumbnail?: string
  skillFocus: SkillType
  difficultyLevel: DifficultyLevel
  estimatedDuration?: number
  maxStudents?: number
  startDate?: string
  endDate?: string
}

export interface TeacherSectionInput {
  title: string
  description?: string
  ordering?: number
}

export interface TeacherLessonInput {
  title: string
  lessonType: 'VIDEO' | 'DOCUMENT' | 'TEXT'
  videoUrl?: string
  videoDuration?: number
  documentUrl?: string
  ordering?: number
  isPreview: boolean
}

export interface TeacherExerciseSummary {
  id: string
  lessonId: string
  title: string
  instruction?: string | null
  audioUrl?: string | null
  exerciseType: ExerciseType
  skillType: SkillType
  timeLimit?: number | null
  maxAttempts: number
  passingScore: number
  ordering: number
  questionCount: number
  submissionCount: number
  createdAt: string
  updatedAt: string
}

export interface TeacherLessonExercises {
  lessonId: string
  lessonTitle: string
  lessonStatus: ContentStatus
  sectionId: string
  sectionTitle: string
  courseId: string
  courseTitle: string
  courseStatus: ContentStatus
  courseSkillFocus?: SkillType | null
  exercises: TeacherExerciseSummary[]
}

export interface TeacherQuestionOption {
  id?: string
  optionText: string
  isCorrect: boolean
  point?: number
  explanation?: string | null
  ordering?: number
}

export interface TeacherQuestion {
  id?: string
  questionText: string
  questionType: QuestionType
  imageUrl?: string | null
  audioUrl?: string | null
  readingPassage?: string | null
  explanation?: string | null
  points: number
  ordering?: number
  options: TeacherQuestionOption[]
}

export interface TeacherQuestionGroup {
  id?: string | null
  groupTitle?: string | null
  groupInstruction?: string | null
  passageReference?: string | null
  imageUrl?: string | null
  questionType?: QuestionType | null
  questionRange?: string | null
  ordering?: number
  questions: TeacherQuestion[]
}

export interface TeacherExerciseDetail {
  id: string
  lessonId: string
  lessonTitle: string
  lessonStatus: ContentStatus
  sectionId: string
  sectionTitle: string
  courseId: string
  courseTitle: string
  courseStatus: ContentStatus
  title: string
  instruction?: string | null
  audioUrl?: string | null
  content?: Record<string, unknown> | null
  exerciseType: ExerciseType
  skillType: SkillType
  timeLimit?: number | null
  maxAttempts: number
  passingScore: number
  ordering: number
  submissionCount: number
  totalQuestions: number
  questionGroups: TeacherQuestionGroup[]
  createdAt: string
  updatedAt: string
}

export interface TeacherExerciseInput {
  title: string
  instruction?: string
  audioUrl?: string
  content?: Record<string, unknown>
  exerciseType: ExerciseType
  skillType: SkillType
  timeLimit?: number
  maxAttempts: number
  passingScore: number
  ordering?: number
}

export interface ReplaceExerciseQuestionsInput {
  questionGroups: Array<{
    groupTitle?: string
    groupInstruction?: string
    passageReference?: string
    imageUrl?: string
    questionType?: QuestionType
    questionRange?: string
    ordering?: number
    questions: Array<{
      questionText: string
      questionType: QuestionType
      imageUrl?: string
      audioUrl?: string
      readingPassage?: string
      explanation?: string
      points: number
      ordering?: number
      options: Array<{
        optionText: string
        isCorrect: boolean
        point?: number
        explanation?: string
        ordering?: number
      }>
    }>
  }>
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface Teacher {
  id: string
  fullName: string
  avatarUrl?: string | null
}

export type EnrollmentStatus = 'IN_PROGRESS' | 'COMPLETED'

export interface CourseSummary {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  level: DifficultyLevel
  categoryName?: string | null
  teacher: Teacher
  estimatedDuration?: number | null
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
  enrollmentCount?: number
  enrollmentStatus: EnrollmentStatus
  /** null when the viewer has not joined the course. */
  enrolledAt: string | null
  completedAt?: string | null
  sectionCount: number
  exerciseCount: number
  completedExerciseCount: number
}

export interface CatalogCourse {
  id: string
  title: string
  description?: string | null
  thumbnail?: string | null
  skillFocus: SkillType
  level: DifficultyLevel
  categoryName?: string | null
  teacher: Teacher
  estimatedDuration?: number | null
  maxStudents?: number | null
  startDate?: string | null
  endDate?: string | null
  enrollmentCount: number
  publishedAt?: string | null
}

export interface LessonSummary {
  id: string
  sectionId: string
  title: string
  lessonType: 'VIDEO' | 'DOCUMENT' | 'TEXT'
  videoDuration?: number | null
  ordering: number
  exerciseCount: number
}

export interface Section {
  id: string
  courseId: string
  title: string
  description?: string | null
  ordering: number
  lessons: LessonSummary[]
  exerciseCount: number
  completedExerciseCount: number
}

export interface CourseDetail extends CourseSummary {
  sections: Section[]
}

export interface Lesson extends LessonSummary {
  description?: string | null
  videoUrl?: string | null
  documentUrl?: string | null
}

/** Per-user stats attached to an exercise in list views. */
export interface ExerciseSummary {
  id: string
  lessonId: string | null
  lessonTitle?: string | null
  sectionId: string | null
  title: string
  exerciseType: ExerciseType
  skillType: SkillType
  timeLimit: number | null
  questionCount: number
  attemptCount: number
  bestScore: number | null
  maxScore: number
  lastSubmissionId: string | null
}

export interface QuestionOption {
  id: string
  optionText: string
  ordering: number
  /** Only present when reviewing a graded submission. */
  isCorrect?: boolean
}

export interface Question {
  id: string
  /** Question number shown to the learner (1..N across the exercise). */
  number: number
  questionText: string
  questionType: QuestionType
  points: number
  options: QuestionOption[]
  /** Only present when reviewing a graded submission. */
  explanation?: string | null
}

export interface QuestionGroup {
  id: string
  groupTitle: string | null
  groupInstruction: string | null
  questionType: QuestionType
  questionRange: string | null
  imageUrl?: string | null
  questions: Question[]
}

export interface ReadingContent {
  passageTitle: string
  subtitle?: string
  paragraphs: { label?: string; text: string }[]
}

export interface ListeningContent {
  sectionTitle: string
  transcript: { speaker: string; text: string }[]
}

export interface Exercise {
  id: string
  lessonId: string | null
  sectionId: string | null
  courseId: string | null
  title: string
  instruction: string | null
  audioUrl: string | null
  content: ReadingContent | ListeningContent | null
  exerciseType: ExerciseType
  skillType: SkillType
  timeLimit: number | null
  maxAttempts: number
  questionGroups: QuestionGroup[]
}

/** Option ids for choice questions, free text for FILL_BLANK. */
export type AnswerValue = string[] | string
export type Answers = Record<string, AnswerValue>

export interface SubmissionRequest {
  exerciseId: string
  answers: Answers
  timeSpent: number
}

export interface QuestionResult {
  questionId: string
  correct: boolean
  earned: number
}

export interface Submission {
  id: string
  exerciseId: string
  exerciseTitle: string
  skillType: SkillType
  exerciseType: ExerciseType
  courseId: string | null
  sectionId?: string | null
  attemptNumber: number
  status: SubmissionStatus
  score: number
  maxScore: number
  aiScore?: number | null
  teacherScore?: number | null
  teacherFeedback?: string | null
  gradingMethod?: GradingMethod | null
  gradedByName?: string | null
  gradedAt?: string | null
  correctCount: number
  questionCount: number
  bandScore?: number | null
  timeSpent: number
  submittedAt: string
}

export interface SubmissionDetail extends Submission {
  studentId?: string | null
  studentName?: string | null
  studentEmail?: string | null
  answers: Answers
  results: QuestionResult[]
  /** Exercise including correct options and explanations, for review. */
  exercise: Exercise
  /** Writing only: the submitted essay, taken from the stored answers. */
  essayText?: string
  /** Writing only: null when the backend does not return the structured feedback of an old submission. */
  writingFeedback?: WritingFeedback | null
  /** Speaking only: transcript of the learner's spoken answer, taken from the stored answers. */
  transcript?: string
  /** Speaking only: structured feedback and ASR features/pronunciation. */
  speakingFeedback?: SpeakingFeedback | null
}

/** Writing criteria, in the order the result page shows them (ontology v0, Task 2). */
export type WritingCriterionId = 'CRIT_W_TR' | 'CRIT_W_CC' | 'CRIT_W_LR' | 'CRIT_W_GRA'

/** One mistake with the exact quote from the essay, its ErrorType code and how to fix it (FR-8.04). */
export interface WritingEvidence {
  quote: string
  errorType: string
  suggestion: string
}

export interface WritingCriterion {
  id: WritingCriterionId
  /** Integer 0-9. */
  band: number
  comment: string
  evidence: WritingEvidence[]
}

export interface WritingFeedback {
  /** QuestionType id of the essay, e.g. QT_W2_DISCUSSION. */
  taskType: string
  /** Mean of the criterion bands rounded to 0.5, computed by the backend. */
  overallBand: number
  outOfCalibrationRange: boolean
  /** Empty when only the overall band and summary are known. */
  criteria: WritingCriterion[]
  summary: string
  improvements: string[]
}

export interface WritingSubmissionRequest {
  exerciseId: string
  essayText: string
  timeSpent: number
}

/** What the backend returns right after grading an essay. */
export interface WritingSubmitResult {
  submissionId: string
  attemptNumber: number
  feedback: WritingFeedback
}

/** Speaking parts and criteria (ontology v0). */
export type SpeakingPartId = 'QT_S_PART1' | 'QT_S_PART2' | 'QT_S_PART3'
export type SpeakingCriterionId = 'CRIT_S_FC' | 'CRIT_S_LR' | 'CRIT_S_GRA' | 'CRIT_S_P'

export interface SpeakingEvidence {
  quote: string
  errorType: string
  suggestion: string
}

export interface SpeakingCriterion {
  id: SpeakingCriterionId
  band: number
  comment: string
  evidence: SpeakingEvidence[]
}

export interface SpeakingFeatures {
  durationSec: number
  wordCount: number
  speechRateWpm: number
  pauseCount: number
  totalPauseSec: number
  longestPauseSec: number
}

export interface SpeakingPronunciation {
  accuracy: number
  fluency: number
  /** null in unscripted mode (no reference text), which is the normal case for IELTS answers. */
  completeness: number | null
  prosody: number | null
  /** gemini: AI estimate from listening to the audio, not an acoustic measurement; null for older submissions. */
  source: PronunciationSource | null
}

export type PronunciationSource = 'gemini'

export interface SpeakingFeedback {
  part: SpeakingPartId
  overallBand: number
  outOfCalibrationRange: boolean
  criteria: SpeakingCriterion[]
  summary: string
  improvements: string[]
  transcript: string
  features: SpeakingFeatures | null
  pronunciation: SpeakingPronunciation | null
}

export interface SpeakingSubmissionRequest {
  exerciseId: string
  audio: Blob | File
  filename?: string
  part?: string | null
  durationSec?: number
}

export interface SpeakingSubmitResult {
  submissionId: string
  attemptNumber: number
  feedback: SpeakingFeedback
}

/** Skills the KG recommendations endpoint accepts (ontology v0 Skill ids). */
export type KgSkill = 'SKILL_W' | 'SKILL_S'

export interface KgNodeRef {
  id: string
  nameVi: string | null
  nameEn: string | null
}

/** One practice Resource, same shape as GET /api/kg/recommendations (docs/kg-api-contract.md). */
export interface KgRecommendation {
  resourceId: string
  nameVi: string | null
  nameEn: string | null
  type: string | null
  /** `exercises:<uuid>` or `lessons:<uuid>`. */
  sqlRef: string | null
  bandMatch: 'exact' | 'nearest' | 'any'
  /** Why it was recommended: ErrorType → SubSkill → Criterion. */
  path: { errorType: KgNodeRef; subSkill: KgNodeRef; criterion: KgNodeRef }
}

export interface KgRecommendations {
  skill: KgSkill
  bandRequested: number | null
  bandApplied: number | null
  /** Grouped by error, in the order of the requested errors. */
  recommendations: KgRecommendation[]
  /** Requested errors with no Resource, or not valid for the skill. */
  unmatchedErrors: string[]
}

export interface KgRecommendationsRequest {
  skill: KgSkill
  errors: string[]
  band?: number
}

export interface CheckAnswerResponse {
  correct: boolean
  correctOptionIds: string[]
  acceptedAnswers: string[]
  explanation: string | null
}

export interface FinalTestSession {
  sessionId: string
  exerciseId: string
  startedAt: string
  expiresAt: string
  remainingSeconds: number
}

export interface FinalTestStatus {
  exercise: ExerciseSummary | null
  unlocked: boolean
  grantExpired: boolean
  deadlineDays: number | null
  unlockedAt: string | null
  grantExpiresAt: string | null
  activeSession: FinalTestSession | null
}

export interface DashboardStats {
  courseCount: number
  completedCourseCount: number
  submissionCount: number
  exercisesDone: number
  readingBand: number | null
  listeningBand: number | null
}

export interface CourseStudentProgressItem {
  studentId: string
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
  scheduleStatus: ScheduleStatus
}

export interface CourseProgressOverview {
  courseId: string
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
  students: CourseStudentProgressItem[]
}

export interface SectionFinalTestProgress {
  exerciseId: string
  exerciseTitle: string
  unlocked: boolean
  grantExpired: boolean
  deadlineDays: number | null
  unlockedAt: string | null
  grantExpiresAt: string | null
  attemptCount: number
  bestScore: number | null
  latestSubmissionId: string | null
}

export interface ExerciseProgressItem {
  exerciseId: string
  title: string
  exerciseType: ExerciseType
  skillType: SkillType
  questionCount: number
  maxScore: number
  attemptCount: number
  bestScore: number | null
  completed: boolean
  latestSubmissionId: string | null
  latestStatus: SubmissionStatus | null
  lastSubmittedAt: string | null
  hasTeacherFeedback: boolean
}

export interface LessonProgressItem {
  lessonId: string
  title: string
  lessonType: string
  ordering: number
  completedExercises: number
  totalExercises: number
  exercises: ExerciseProgressItem[]
}

export interface SectionProgressItem {
  sectionId: string
  title: string
  ordering: number
  completedExercises: number
  totalExercises: number
  finalTest: SectionFinalTestProgress | null
  lessons: LessonProgressItem[]
}

export interface StudentSubmissionHistoryItem {
  id: string
  exerciseId: string
  exerciseTitle: string
  skillType: SkillType
  exerciseType: ExerciseType
  attemptNumber: number
  status: SubmissionStatus
  score: number
  maxScore: number
  aiScore: number | null
  teacherScore: number | null
  teacherFeedback: string | null
  gradingMethod: GradingMethod | null
  gradedByName: string | null
  gradedAt: string | null
  submittedAt: string
  timeSpent: number | null
}

export interface StudentCourseProgressDetail {
  courseId: string
  courseTitle: string
  startDate: string | null
  endDate: string | null
  maxStudents: number | null
  studentId: string
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
  scheduleStatus: ScheduleStatus
  sections: SectionProgressItem[]
  submissions: StudentSubmissionHistoryItem[]
}

export interface TeacherSubmissionFeedbackInput {
  teacherScore?: number | null
  teacherFeedback: string
}

export function isReadingContent(c: Exercise['content']): c is ReadingContent {
  return !!c && 'paragraphs' in c
}

export function isListeningContent(c: Exercise['content']): c is ListeningContent {
  return !!c && 'transcript' in c
}

/** Skills of the personalization tab (the AI-graded ones). */
export type ProfileSkill = 'WRITING' | 'SPEAKING'

/** WEAK: in the latest attempt. IMPROVING: gone from it. RESOLVED: gone from the last 3 attempts. */
export type WeaknessStatus = 'WEAK' | 'IMPROVING' | 'RESOLVED'

export interface BandPoint {
  submissionId: string
  gradedAt: string
  band: number
}

export interface SubSkillProfile {
  subSkill: KgNodeRef
  /** Estimated mastery 0-1, null before any graded attempt touched it. */
  mastery: number | null
  evidence: number | null
}

export interface CriterionProfile {
  criterion: KgNodeRef
  /** Mean band of the last 3 attempts. */
  currentBand: number | null
  /** target - current, null without a target. */
  gap: number | null
  history: BandPoint[]
  subSkills: SubSkillProfile[]
}

export interface PracticeResource {
  resourceId: string
  nameVi: string | null
  nameEn: string | null
  exerciseId: string | null
  fixesError: boolean
  bands: number[]
  practicedCount: number
}

export interface Weakness {
  errorType: KgNodeRef
  subSkill: KgNodeRef
  criterion: KgNodeRef
  status: WeaknessStatus
  occurrences: number
  recentOccurrences: number
  recentWindow: number
  cleanStreak: number
  lastSeenAt: string
  mastery: number | null
  criterionBand: number | null
  targetBand: number | null
  priority: number
  /** A weak prerequisite SubSkill to strengthen first. */
  prerequisite: KgNodeRef | null
  prerequisiteMastery: number | null
  resources: PracticeResource[]
}

export interface CriterionGap {
  criterion: KgNodeRef
  currentBand: number | null
  targetBand: number | null
  gap: number
  /** WEAK or IMPROVING errors of the criterion; 0 means range, not errors, holds the band back. */
  activeErrorCount: number
}

export interface SkillProfile {
  skill: ProfileSkill
  kgSkill: KgSkill
  targetBand: number | null
  currentBand: number | null
  attemptCount: number
  bandHistory: BandPoint[]
  criteria: CriterionProfile[]
  /** Most urgent first; resolved ones last. */
  weaknesses: Weakness[]
  gaps: CriterionGap[]
}

/** GET /api/personalization */
export interface Personalization {
  skills: SkillProfile[]
}
