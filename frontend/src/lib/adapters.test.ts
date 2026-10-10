import { describe, expect, it } from 'vitest'
import {
  toBackendAnswers,
  toCourseDetail,
  toCourseSummary,
  toDashboardStats,
  toExercise,
  toExerciseSummaries,
  toLesson,
  toSubmission,
  toSubmissionDetail,
} from './adapters'
import type {
  BeCourseDetail,
  BeExercise,
  BeExerciseSummary,
  BeLessonDetail,
  BeMyCourse,
  BeSubmissionDetail,
} from './backend-types'

const myCourse: BeMyCourse = {
  id: 'c1',
  title: 'IELTS Reading Foundations',
  description: 'Core strategies',
  thumbnail: null,
  difficultyLevel: 'INTERMEDIATE',
  skillFocus: 'READING',
  categoryName: 'Academic',
  teacherId: 't1',
  teacherName: 'Demo Teacher',
  estimatedDuration: 600,
  enrolledAt: '2026-10-10T09:00:00',
  completedAt: null,
  sectionCount: 2,
  exerciseCount: 1,
  completedExerciseCount: 0,
}

describe('course adapters', () => {
  it('maps /courses/my to the course card model', () => {
    const c = toCourseSummary(myCourse)
    expect(c.level).toBe('INTERMEDIATE')
    expect(c.teacher).toEqual({ id: 't1', fullName: 'Demo Teacher', avatarUrl: null })
    expect(c.enrollmentStatus).toBe('IN_PROGRESS')
    expect(
      toCourseSummary({ ...myCourse, completedAt: '2026-10-11T09:00:00' }).enrollmentStatus,
    ).toBe('COMPLETED')
  })

  it('flattens GET /courses/{id} and tolerates anonymous viewers', () => {
    const raw: BeCourseDetail = {
      course: {
        id: 'c1',
        teacherId: 't1',
        teacherName: 'Demo Teacher',
        categoryName: 'Academic',
        title: 'Reading',
        description: null,
        thumbnail: null,
        skillFocus: 'READING',
        difficultyLevel: 'ELEMENTARY',
        estimatedDuration: 480,
      },
      totalLessons: 3,
      exerciseCount: 2,
      completedExerciseCount: null,
      enrollment: null,
      sections: [
        {
          id: 's1',
          title: 'Getting started',
          description: null,
          ordering: 1,
          exerciseCount: 2,
          completedExerciseCount: null,
          lessons: [
            {
              id: 'l1',
              sectionId: 's1',
              title: 'Intro',
              lessonType: 'VIDEO',
              videoDuration: 540,
              ordering: 1,
              exerciseCount: 1,
            },
            {
              id: 'l2',
              sectionId: 's1',
              title: 'Odd',
              lessonType: 'WEIRD',
              videoDuration: null,
              ordering: 2,
            },
          ],
        },
      ],
    }
    const c = toCourseDetail(raw)
    expect(c.enrolledAt).toBeNull()
    expect(c.completedExerciseCount).toBe(0)
    expect(c.sectionCount).toBe(1)
    expect(c.sections[0].courseId).toBe('c1')
    expect(c.sections[0].lessons.map((l) => [l.lessonType, l.exerciseCount])).toEqual([
      ['VIDEO', 1],
      ['TEXT', 0], // unknown lesson types fall back to TEXT so the icon lookup never fails
    ])
  })
})

describe('exercise summaries', () => {
  const summary = (over: Partial<BeExerciseSummary>): BeExerciseSummary => ({
    id: 'e1',
    title: 'Farming in the Sky',
    exerciseType: 'PRACTICE',
    skillType: 'READING',
    timeLimit: 1200,
    ordering: 1,
    questionCount: 13,
    maxScore: '13.00',
    attemptCount: 1,
    bestScore: '9.00',
    lastSubmissionId: 's1',
    ...over,
  })

  it('hides placeholder exercises without questions and coerces numbers', () => {
    const list = toExerciseSummaries([summary({}), summary({ id: 'e2', questionCount: 0 })])
    expect(list.map((e) => e.id)).toEqual(['e1'])
    expect(list[0].bestScore).toBe(9)
    expect(list[0].maxScore).toBe(13)
  })

  it('treats a missing score as "not attempted"', () => {
    const [e] = toExerciseSummaries([
      summary({ bestScore: null, attemptCount: 0, lastSubmissionId: null }),
    ])
    expect(e.bestScore).toBeNull()
    expect(e.attemptCount).toBe(0)
  })

  it('counts only exercises with questions on the lesson', () => {
    const raw: BeLessonDetail = {
      lesson: {
        id: 'l1',
        sectionId: 's1',
        title: 'Skimming',
        lessonType: 'VIDEO',
        videoUrl: 'https://x/v.mp4',
        videoDuration: 720,
        documentUrl: null,
        ordering: 2,
      },
      courseId: 'c1',
      courseTitle: 'Reading',
      sectionId: 's1',
      sectionTitle: 'Getting started',
      exercises: [summary({}), summary({ id: 'e2', questionCount: 0 })],
    }
    const lesson = toLesson(raw)
    expect(lesson.exerciseCount).toBe(1)
    expect(lesson.videoUrl).toBe('https://x/v.mp4')
  })
})

const beExercise: BeExercise = {
  id: 'e1',
  lessonId: 'l1',
  sectionId: 's1',
  courseId: 'c1',
  title: 'Farming in the Sky',
  instruction: null,
  audioUrl: null,
  content: { passageTitle: 'Farming', paragraphs: [{ label: 'A', text: 'Cities...' }] },
  exerciseType: 'PRACTICE',
  skillType: 'READING',
  timeLimit: 1200,
  maxAttempts: 99,
  questionGroups: [
    {
      id: 'g1',
      groupTitle: 'Questions 1-2',
      groupInstruction: 'Choose',
      questionType: 'TRUE_FALSE',
      questionRange: '1-2',
      questions: [
        {
          id: 'q1',
          ordering: 1,
          questionText: 'A',
          questionType: 'TRUE_FALSE',
          points: '1.00',
          options: [
            { id: 'o1', optionText: 'TRUE', ordering: 1 },
            { id: 'o2', optionText: 'FALSE', ordering: 2 },
          ],
        },
        {
          id: 'q2',
          ordering: 2,
          questionText: 'Surname: ______',
          questionType: 'FILL_BLANK',
          points: 1,
          options: [],
        },
      ],
    },
  ],
}

describe('toExercise', () => {
  it('numbers questions by ordering and never invents answers for the practice payload', () => {
    const ex = toExercise(beExercise)
    const [q1, q2] = ex.questionGroups[0].questions
    expect([q1.number, q2.number]).toEqual([1, 2])
    expect(q1.points).toBe(1)
    expect(q1.options[0]).not.toHaveProperty('isCorrect')
    expect(q1).not.toHaveProperty('explanation')
    expect(ex.courseId).toBe('c1')
    expect(ex.sectionId).toBe('s1')
  })

  it('keeps correct options and explanations from the review payload', () => {
    const review: BeExercise = {
      ...beExercise,
      questionGroups: [
        {
          ...beExercise.questionGroups[0],
          questions: [
            {
              ...beExercise.questionGroups[0].questions[0],
              explanation: 'Paragraph B says so.',
              options: [{ id: 'o1', optionText: 'TRUE', ordering: 1, isCorrect: true }],
            },
          ],
        },
      ],
    }
    const q = toExercise(review).questionGroups[0].questions[0]
    expect(q.explanation).toBe('Paragraph B says so.')
    expect(q.options[0].isCorrect).toBe(true)
  })
})

describe('submissions', () => {
  const detail: BeSubmissionDetail = {
    id: 's1',
    exerciseId: 'e1',
    exerciseTitle: 'Farming in the Sky',
    skillType: 'READING',
    exerciseType: 'PRACTICE',
    courseId: 'c1',
    sectionId: 's1',
    attemptNumber: 1,
    status: 'GRADED',
    score: '9.00',
    maxScore: '13.00',
    correctCount: 9,
    questionCount: 13,
    timeSpent: null,
    submittedAt: '2026-10-10T10:15:00',
    answers: { q1: 'o2', q2: 'Thornley' },
    results: [{ questionId: 'q1', correct: true, earned: '1.00' }],
    exercise: beExercise,
  }

  it('coerces numbers and defaults a missing time to 0', () => {
    const s = toSubmission(detail)
    expect([s.score, s.maxScore, s.timeSpent]).toEqual([9, 13, 0])
  })

  it('wraps single option ids into arrays but keeps typed text', () => {
    const d = toSubmissionDetail(detail)
    expect(d.answers).toEqual({ q1: ['o2'], q2: 'Thornley' })
    expect(d.results).toEqual([{ questionId: 'q1', correct: true, earned: 1 }])
  })
})

describe('toBackendAnswers', () => {
  it('sends a single string per question and drops blank answers', () => {
    expect(
      toBackendAnswers({
        q1: ['o2'],
        q2: ['o1', 'o3'],
        q3: 'sponge',
        q4: [],
        q5: '   ',
      }),
    ).toEqual({ q1: 'o2', q2: 'o1', q3: 'sponge' })
  })
})

describe('toDashboardStats', () => {
  it('derives the home statistics and never reports a band for practice', () => {
    const courses = [
      toCourseSummary(myCourse),
      toCourseSummary({ ...myCourse, id: 'c2', completedAt: '2026-10-11T09:00:00' }),
    ]
    const base = toSubmission({
      id: 's0',
      exerciseId: 'e1',
      exerciseTitle: 'x',
      skillType: 'READING',
      exerciseType: 'PRACTICE',
      courseId: null,
      attemptNumber: 1,
      status: 'GRADED',
      score: 1,
      maxScore: 1,
      correctCount: 1,
      questionCount: 1,
      timeSpent: 1,
      submittedAt: '2026-10-10T10:00:00',
    })
    const submissions = ['e1', 'e1', 'e2'].map((exerciseId, i) => ({
      ...base,
      id: `s${i}`,
      exerciseId,
    }))
    const stats = toDashboardStats(courses, submissions)
    expect(stats).toMatchObject({
      courseCount: 2,
      completedCourseCount: 1,
      submissionCount: 3,
      exercisesDone: 2,
      readingBand: null,
      listeningBand: null,
    })
  })
})
