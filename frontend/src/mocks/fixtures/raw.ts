import type { Exercise, ExerciseType, QuestionType, SkillType } from '@/lib/types'

/** Shape of data/exercises/**\/*.json (same as the backend ExerciseRequest). */
export interface RawExercise {
  title: string
  instruction: string | null
  audioUrl: string | null
  content: unknown
  exerciseType: string
  skillType: string
  timeLimit: number | null
  maxAttempts: number
  questionGroups: {
    groupTitle: string | null
    groupInstruction: string | null
    imageUrl?: string | null
    questionType: string
    questionRange: string | null
    questions: {
      questionText: string
      questionType: string
      explanation: string | null
      points: number
      ordering: number
      options: { optionText: string; isCorrect: boolean; ordering: number }[]
    }[]
  }[]
}

export interface Placement {
  id: string
  courseId: string
  sectionId: string
  lessonId: string
  title?: string
}

/**
 * Builds a full exercise (with correct answers and explanations) from raw JSON. IDs are derived
 * from the exercise id so they stay stable across reloads.
 */
export function buildExercise(raw: RawExercise, p: Placement): Exercise {
  return {
    id: p.id,
    courseId: p.courseId,
    sectionId: p.sectionId,
    lessonId: p.lessonId,
    title: p.title ?? raw.title,
    instruction: raw.instruction,
    audioUrl: raw.audioUrl,
    content: raw.content as Exercise['content'],
    exerciseType: raw.exerciseType as ExerciseType,
    skillType: raw.skillType as SkillType,
    timeLimit: raw.timeLimit,
    maxAttempts: raw.maxAttempts,
    questionGroups: raw.questionGroups.map((g, gi) => ({
      id: `${p.id}-g${gi + 1}`,
      groupTitle: g.groupTitle,
      groupInstruction: g.groupInstruction,
      imageUrl: g.imageUrl ?? null,
      questionType: g.questionType as QuestionType,
      questionRange: g.questionRange,
      questions: g.questions.map((q) => {
        const qid = `${p.id}-q${q.ordering}`
        return {
          id: qid,
          number: q.ordering,
          questionText: q.questionText,
          questionType: q.questionType as QuestionType,
          points: q.points,
          explanation: q.explanation,
          options: q.options.map((o) => ({
            id: `${qid}-o${o.ordering}`,
            optionText: o.optionText,
            ordering: o.ordering,
            isCorrect: o.isCorrect,
          })),
        }
      }),
    })),
  }
}

type Opt = string | [string, true]

/** Compact authoring helper: options marked `[text, true]` are correct. */
export function q(
  ordering: number,
  questionType: string,
  questionText: string,
  options: Opt[],
  explanation: string,
) {
  return {
    questionText,
    questionType,
    explanation,
    points: 1,
    ordering,
    options: options.map((o, i) => ({
      optionText: Array.isArray(o) ? o[0] : o,
      isCorrect: Array.isArray(o),
      ordering: i + 1,
    })),
  }
}
