// Types mirror the backend schema (db/migration/V1__init_schema.sql) and enums in
// com.ielts.backend.enums. Replace with types generated from /v3/api-docs once the API exists.

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN'
export type SkillType = 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING'
export type ExerciseType = 'LESSON' | 'MOCK_TEST' | 'PRACTICE'
export type DifficultyLevel =
  'BEGINNER' | 'ELEMENTARY' | 'INTERMEDIATE' | 'UPPER_INTERMEDIATE' | 'ADVANCED'
export type QuestionType =
  'MULTIPLE_CHOICE' | 'DROPLIST' | 'FILL_BLANK' | 'TRUE_FALSE' | 'MATCHING' | 'ESSAY' | 'SPEAKING'
export type SubmissionStatus = 'PENDING' | 'GRADING' | 'GRADED' | 'FAILED'

export interface User {
  id: string
  email: string
  fullName: string
  avatarUrl?: string | null
  bio?: string | null
  phone?: string | null
  role: Role
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
  enrollmentStatus: EnrollmentStatus
  enrolledAt: string
  completedAt?: string | null
  sectionCount: number
  exerciseCount: number
  completedExerciseCount: number
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
  attemptNumber: number
  status: SubmissionStatus
  score: number
  maxScore: number
  correctCount: number
  questionCount: number
  timeSpent: number
  submittedAt: string
}

export interface SubmissionDetail extends Submission {
  answers: Answers
  results: QuestionResult[]
  /** Exercise including correct options and explanations, for review. */
  exercise: Exercise
}

export interface CheckAnswerResponse {
  correct: boolean
  correctOptionIds: string[]
  acceptedAnswers: string[]
  explanation: string | null
}

export interface DashboardStats {
  courseCount: number
  completedCourseCount: number
  submissionCount: number
  exercisesDone: number
  readingBand: number | null
  listeningBand: number | null
}

export function isReadingContent(c: Exercise['content']): c is ReadingContent {
  return !!c && 'paragraphs' in c
}

export function isListeningContent(c: Exercise['content']): c is ListeningContent {
  return !!c && 'transcript' in c
}
