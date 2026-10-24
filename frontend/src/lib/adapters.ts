import type {
  BeCourseDetail,
  BeExercise,
  BeExerciseSummary,
  BeLessonDetail,
  BeLessonSummary,
  BeMyCourse,
  BeSpeakingFeatures,
  BeSpeakingFeedback,
  BeSpeakingPronunciation,
  BeSpeakingResult,
  BeSubmissionDetail,
  BeSubmissionSummary,
  BeWritingFeedback,
  BeWritingResult,
} from './backend-types'
import type {
  Answers,
  CourseDetail,
  CourseSummary,
  DashboardStats,
  DifficultyLevel,
  Exercise,
  ExerciseSummary,
  ExerciseType,
  Lesson,
  LessonSummary,
  QuestionType,
  SkillType,
  SpeakingCriterion,
  SpeakingCriterionId,
  SpeakingFeatures,
  SpeakingFeedback,
  SpeakingPartId,
  SpeakingPronunciation,
  SpeakingSubmitResult,
  Submission,
  SubmissionDetail,
  SubmissionStatus,
  WritingCriterion,
  WritingCriterionId,
  WritingFeedback,
  WritingSubmitResult,
} from './types'

// Turns backend JSON into the models the UI uses. All knowledge of backend field names lives
// here, so components never change when an endpoint or a field name does.

const num = (value: number | string) => Number(value)
const numOrNull = (value: number | string | null | undefined) =>
  value === null || value === undefined ? null : Number(value)

const LESSON_TYPES = ['VIDEO', 'DOCUMENT', 'TEXT'] as const

function lessonType(value: string): LessonSummary['lessonType'] {
  return (LESSON_TYPES as readonly string[]).includes(value)
    ? (value as LessonSummary['lessonType'])
    : 'TEXT'
}

function toLessonSummary(l: BeLessonSummary): LessonSummary {
  return {
    id: l.id,
    sectionId: l.sectionId,
    title: l.title,
    lessonType: lessonType(l.lessonType),
    videoDuration: l.videoDuration,
    ordering: l.ordering,
    exerciseCount: l.exerciseCount ?? 0,
  }
}

export function toCourseSummary(c: BeMyCourse): CourseSummary {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail: c.thumbnail,
    level: c.difficultyLevel as DifficultyLevel,
    categoryName: c.categoryName,
    teacher: { id: c.teacherId, fullName: c.teacherName, avatarUrl: null },
    estimatedDuration: c.estimatedDuration,
    enrollmentStatus: c.completedAt ? 'COMPLETED' : 'IN_PROGRESS',
    enrolledAt: c.enrolledAt,
    completedAt: c.completedAt,
    sectionCount: c.sectionCount,
    exerciseCount: c.exerciseCount,
    completedExerciseCount: c.completedExerciseCount,
  }
}

/** GET /courses/{id} nests the course and sits the progress numbers at the top level. */
export function toCourseDetail(r: BeCourseDetail): CourseDetail {
  const c = r.course
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnail: c.thumbnail,
    level: c.difficultyLevel as DifficultyLevel,
    categoryName: c.categoryName,
    teacher: { id: c.teacherId, fullName: c.teacherName, avatarUrl: null },
    estimatedDuration: c.estimatedDuration,
    enrollmentStatus: r.enrollment?.completedAt ? 'COMPLETED' : 'IN_PROGRESS',
    enrolledAt: r.enrollment?.enrolledAt ?? null,
    completedAt: r.enrollment?.completedAt ?? null,
    sectionCount: r.sections.length,
    exerciseCount: r.exerciseCount ?? 0,
    completedExerciseCount: r.completedExerciseCount ?? 0,
    sections: r.sections.map((s) => ({
      id: s.id,
      courseId: c.id,
      title: s.title,
      description: s.description,
      ordering: s.ordering,
      lessons: s.lessons.map(toLessonSummary),
      exerciseCount: s.exerciseCount ?? 0,
      completedExerciseCount: s.completedExerciseCount ?? 0,
    })),
  }
}

/** Exercises without questions are placeholders in the seed data: the UI hides them. */
export const hasQuestions = (e: BeExerciseSummary) => (e.questionCount ?? 0) > 0

export function toExerciseSummary(e: BeExerciseSummary): ExerciseSummary {
  return {
    id: e.id,
    lessonId: e.lessonId ?? null,
    lessonTitle: e.lessonTitle ?? null,
    sectionId: e.sectionId ?? null,
    title: e.title,
    exerciseType: e.exerciseType as ExerciseType,
    skillType: e.skillType as SkillType,
    timeLimit: e.timeLimit,
    questionCount: e.questionCount ?? 0,
    attemptCount: e.attemptCount ?? 0,
    bestScore: numOrNull(e.bestScore),
    maxScore: num(e.maxScore ?? 0),
    lastSubmissionId: e.lastSubmissionId ?? null,
  }
}

export const toExerciseSummaries = (list: BeExerciseSummary[]) =>
  list.filter(hasQuestions).map(toExerciseSummary)

export function toLesson(r: BeLessonDetail): Lesson {
  const l = r.lesson
  return {
    ...toLessonSummary({ ...l, exerciseCount: r.exercises.filter(hasQuestions).length }),
    description: null,
    videoUrl: l.videoUrl,
    documentUrl: l.documentUrl,
  }
}

/** The learner-facing number of a question is its `ordering` (1..N across the exercise). */
export function toExercise(e: BeExercise): Exercise {
  return {
    id: e.id,
    lessonId: e.lessonId,
    sectionId: e.sectionId ?? null,
    courseId: e.courseId ?? null,
    title: e.title,
    instruction: e.instruction,
    audioUrl: e.audioUrl,
    content: e.content as Exercise['content'],
    exerciseType: e.exerciseType as ExerciseType,
    skillType: e.skillType as SkillType,
    timeLimit: e.timeLimit,
    maxAttempts: e.maxAttempts ?? 1,
    questionGroups: e.questionGroups.map((g) => ({
      id: g.id,
      groupTitle: g.groupTitle,
      groupInstruction: g.groupInstruction,
      questionType: g.questionType as QuestionType,
      questionRange: g.questionRange,
      imageUrl: g.imageUrl ?? null,
      questions: g.questions.map((q) => ({
        id: q.id,
        number: q.ordering,
        questionText: q.questionText,
        questionType: q.questionType as QuestionType,
        points: num(q.points),
        // Only present in the review payload.
        ...(q.explanation !== undefined && { explanation: q.explanation }),
        options: q.options.map((o) => ({
          id: o.id,
          optionText: o.optionText,
          ordering: o.ordering,
          ...(o.isCorrect !== undefined && { isCorrect: o.isCorrect }),
        })),
      })),
    })),
  }
}

export function toSubmission(s: BeSubmissionSummary): Submission {
  return {
    id: s.id,
    exerciseId: s.exerciseId,
    exerciseTitle: s.exerciseTitle,
    skillType: s.skillType as SkillType,
    exerciseType: s.exerciseType as ExerciseType,
    courseId: s.courseId,
    sectionId: s.sectionId ?? null,
    attemptNumber: s.attemptNumber,
    status: s.status as SubmissionStatus,
    score: num(s.score),
    maxScore: num(s.maxScore),
    correctCount: s.correctCount,
    questionCount: s.questionCount,
    timeSpent: s.timeSpent ?? 0,
    submittedAt: s.submittedAt,
  }
}

export const WRITING_CRITERIA: readonly WritingCriterionId[] = [
  'CRIT_W_TR',
  'CRIT_W_CC',
  'CRIT_W_LR',
  'CRIT_W_GRA',
]

export const SPEAKING_CRITERIA: readonly SpeakingCriterionId[] = [
  'CRIT_S_FC',
  'CRIT_S_LR',
  'CRIT_S_GRA',
  'CRIT_S_P',
]

/**
 * Raw feedback → UI model. The overall band is the backend's (derived from the criterion bands
 * and rounded to 0.5); the UI never recomputes it. Criteria the LLM left out are skipped, and a
 * missing `raw` gives a feedback with only the overall band and summary.
 */
export function toWritingFeedback(
  raw: BeWritingFeedback | null | undefined,
  base: {
    taskType: string | null
    overallBand: number | string
    outOfCalibrationRange: boolean | null
    summary: string | null
    improvements: string[] | null
  },
): WritingFeedback {
  const criteria: WritingCriterion[] = []
  for (const id of WRITING_CRITERIA) {
    const c = raw?.criteria?.[id]
    if (!c) continue
    criteria.push({
      id,
      band: num(c.band),
      comment: c.comment ?? c.feedback ?? '',
      evidence: (c.evidence ?? []).map((e) => ({
        quote: e.quote,
        errorType: e.error_type,
        suggestion: e.suggestion ?? e.comment ?? '',
      })),
    })
  }
  return {
    taskType: raw?.task ?? base.taskType ?? 'QT_W2_OPINION',
    overallBand: num(base.overallBand),
    outOfCalibrationRange: base.outOfCalibrationRange ?? raw?.out_of_calibration_range ?? false,
    criteria,
    summary: raw?.summary ?? base.summary ?? '',
    improvements: raw?.improvements ?? base.improvements ?? [],
  }
}

export function toWritingResult(r: BeWritingResult): WritingSubmitResult {
  return {
    submissionId: r.submissionId,
    attemptNumber: r.attemptNumber,
    feedback: toWritingFeedback(r.rawFeedback, r),
  }
}

export function toSpeakingFeatures(
  raw: BeSpeakingFeatures | null | undefined,
): SpeakingFeatures | null {
  if (!raw || typeof raw !== 'object') return null
  return {
    durationSec: num(raw.duration_sec ?? 0),
    wordCount: num(raw.word_count ?? 0),
    speechRateWpm: num(raw.speech_rate_wpm ?? 0),
    pauseCount: num(raw.pause_count ?? 0),
    totalPauseSec: num(raw.total_pause_sec ?? 0),
    longestPauseSec: num(raw.longest_pause_sec ?? 0),
  }
}

export function toSpeakingPronunciation(
  raw: BeSpeakingPronunciation | null | undefined,
): SpeakingPronunciation | null {
  if (!raw || typeof raw !== 'object') return null
  return {
    accuracy: num(raw.accuracy ?? 0),
    fluency: num(raw.fluency ?? 0),
    completeness: num(raw.completeness ?? 0),
    prosody: numOrNull(raw.prosody),
  }
}

function toSpeakingPart(value: string | null | undefined): SpeakingPartId {
  if (value === 'QT_S_PART1' || value === 'QT_S_PART2' || value === 'QT_S_PART3') {
    return value
  }
  return 'QT_S_PART2'
}

export function toSpeakingFeedback(
  raw: BeSpeakingFeedback | null | undefined,
  base: {
    part: string | null
    overallBand: number | string
    outOfCalibrationRange: boolean | null
    summary: string | null
    improvements: string[] | null
    transcript: string | null
    features: BeSpeakingFeatures | null
    pronunciation: BeSpeakingPronunciation | null
  },
): SpeakingFeedback {
  const criteria: SpeakingCriterion[] = []
  for (const id of SPEAKING_CRITERIA) {
    const c = raw?.criteria?.[id]
    if (!c) continue
    criteria.push({
      id,
      band: num(c.band),
      comment: c.comment ?? c.feedback ?? '',
      evidence: (c.evidence ?? []).map((e) => ({
        quote: e.quote,
        errorType: e.error_type,
        suggestion: e.suggestion ?? e.comment ?? '',
      })),
    })
  }
  return {
    part: toSpeakingPart(raw?.part ?? base.part),
    overallBand: num(base.overallBand),
    outOfCalibrationRange: base.outOfCalibrationRange ?? raw?.out_of_calibration_range ?? false,
    criteria,
    summary: raw?.summary ?? base.summary ?? '',
    improvements: raw?.improvements ?? base.improvements ?? [],
    transcript: base.transcript ?? '',
    features: toSpeakingFeatures(base.features),
    pronunciation: toSpeakingPronunciation(base.pronunciation),
  }
}

export function toSpeakingResult(r: BeSpeakingResult): SpeakingSubmitResult {
  return {
    submissionId: r.submissionId,
    attemptNumber: r.attemptNumber,
    feedback: toSpeakingFeedback(r.rawFeedback, r),
  }
}

export function toSubmissionDetail(s: BeSubmissionDetail): SubmissionDetail {
  const exercise = toExercise(s.exercise)
  if (s.skillType === 'WRITING') {
    const stored = s.aiStructuredFeedback as BeWritingFeedback | null | undefined
    return {
      ...toSubmission(s),
      answers: {},
      results: [],
      exercise,
      essayText: String(s.answers?.essayText ?? ''),
      // Without the structured feedback only the band is known: the page then asks the cache.
      writingFeedback: stored
        ? toWritingFeedback(stored, {
            taskType: null,
            overallBand: s.score,
            outOfCalibrationRange: null,
            summary: s.aiFeedback ?? null,
            improvements: null,
          })
        : null,
    }
  }
  if (s.skillType === 'SPEAKING') {
    const stored = s.aiStructuredFeedback as BeSpeakingFeedback | null | undefined
    const transcript =
      typeof s.answers?.transcript === 'string' ? s.answers.transcript : ''
    const features = (s.answers?.features as BeSpeakingFeatures | null | undefined) ?? null
    const pronunciation =
      (s.answers?.pronunciation as BeSpeakingPronunciation | null | undefined) ?? null
    const part = typeof s.answers?.part === 'string' ? s.answers.part : null
    return {
      ...toSubmission(s),
      answers: {},
      results: [],
      exercise,
      transcript,
      speakingFeedback:
        stored || transcript || features || pronunciation
          ? toSpeakingFeedback(stored, {
              part,
              overallBand: s.score,
              outOfCalibrationRange: null,
              summary: s.aiFeedback ?? null,
              improvements: null,
              transcript,
              features,
              pronunciation,
            })
          : null,
    }
  }
  const types = new Map(
    exercise.questionGroups.flatMap((g) => g.questions.map((q) => [q.id, q.questionType] as const)),
  )
  // The backend stores a single option id per choice question; the UI models answers as arrays
  // of option ids (so "choose TWO" can be added later) and as text for FILL_BLANK.
  const answers: Answers = {}
  for (const [questionId, value] of Object.entries(s.answers ?? {})) {
    const strOrArr = Array.isArray(value)
      ? value.map(String)
      : String(value ?? '')
    answers[questionId] =
      Array.isArray(strOrArr) || types.get(questionId) === 'FILL_BLANK' ? strOrArr : [strOrArr]
  }
  return {
    ...toSubmission(s),
    answers,
    results: s.results.map((r) => ({
      questionId: r.questionId,
      correct: r.correct,
      earned: num(r.earned),
    })),
    exercise,
  }
}

/** UI answers → backend format: one option id (string) per choice question, text for blanks. */
export function toBackendAnswers(answers: Answers): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [questionId, value] of Object.entries(answers)) {
    const text = Array.isArray(value) ? value[0] : value
    if (text !== undefined && text.trim() !== '') out[questionId] = text
  }
  return out
}

/** Home-page statistics, computed in the client from the learner's courses and submissions. */
export function toDashboardStats(
  courses: CourseSummary[],
  submissions: Submission[],
): DashboardStats {
  return {
    courseCount: courses.length,
    completedCourseCount: courses.filter((c) => c.enrollmentStatus === 'COMPLETED').length,
    submissionCount: submissions.length,
    exercisesDone: new Set(submissions.map((s) => s.exerciseId)).size,
    // Practice is not converted to a band (SRS 2.2.2.1); bands belong to mock tests.
    readingBand: null,
    listeningBand: null,
  }
}
