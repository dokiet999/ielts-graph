import { gradeQuestion } from '@/lib/grading'
import type {
  BeAdminCourseDetail,
  BeCategory,
  BeTeacherExerciseDetail,
} from '@/lib/backend-types'
import type { Answers, Exercise, QuestionResult, User, UserStatus } from '@/lib/types'
import { DEMO_PASSWORD, exercises, seedAttempts, seedUsers } from './fixtures/courses'

// In-browser stand-in for the backend database. Persisted to localStorage so registrations,
// profile edits, moderation decisions and submissions survive reloads. Bump VERSION when the shape changes.
const KEY = 'ielts-mock-db'
const VERSION = 5

export interface StoredUser extends User {
  /** Backend accounts log in by username (HTTP Basic). */
  username: string
  password: string
  status: UserStatus
  isActive: boolean
  emailVerified: boolean
  lockReason: string | null
  createdAt: string
  updatedAt: string
}

export interface StoredSubmission {
  id: string
  userId: string
  exerciseId: string
  attemptNumber: number
  answers: Answers
  results: QuestionResult[]
  score: number
  maxScore: number
  correctCount: number
  questionCount: number
  timeSpent: number
  submittedAt: string
  /** Writing/Speaking: the grader's feedback, kept like user_submissions.ai_structured_feedback. */
  aiStructuredFeedback?: Record<string, unknown> | null
}

interface DbState {
  version: number
  users: StoredUser[]
  submissions: StoredSubmission[]
  categories: BeCategory[]
  moderationCourses: BeAdminCourseDetail[]
  teacherExercises: BeTeacherExerciseDetail[]
}

export const allQuestions = (ex: Exercise) => ex.questionGroups.flatMap((g) => g.questions)

export function gradeExercise(ex: Exercise, answers: Answers) {
  const results: QuestionResult[] = allQuestions(ex).map((q) => {
    const correct = gradeQuestion(q, answers[q.id])
    return { questionId: q.id, correct, earned: correct ? q.points : 0 }
  })
  return {
    results,
    score: results.reduce((s, r) => s + r.earned, 0),
    maxScore: allQuestions(ex).reduce((s, q) => s + q.points, 0),
    correctCount: results.filter((r) => r.correct).length,
    questionCount: results.length,
  }
}

/** Builds answers that get exactly `correct` questions right (used for seed data). */
function answersWithScore(ex: Exercise, correct: number): Answers {
  const answers: Answers = {}
  allQuestions(ex).forEach((q, i) => {
    const right = q.options.filter((o) => o.isCorrect)
    const wrong = q.options.find((o) => !o.isCorrect)
    if (q.questionType === 'FILL_BLANK') {
      answers[q.id] = i < correct ? right[0].optionText : 'unknown'
    } else if (i < correct) {
      answers[q.id] = right[0].id
    } else if (wrong) {
      answers[q.id] = wrong.id
    }
  })
  return answers
}

function seedModerationCourses(now: number): BeAdminCourseDetail[] {
  const day = 86_400_000
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString()

  return [
    {
      id: 'mc-reading-approved',
      title: 'IELTS Reading Foundations',
      description: 'Chiến lược đọc hiểu học thuật và luyện tập các dạng câu hỏi trọng tâm.',
      thumbnail: null,
      teacherId: 'u-teacher-demo',
      teacherName: 'Nguyễn Minh Anh',
      categoryId: 'cat-academic',
      categoryName: 'Academic',
      skillFocus: 'READING',
      difficultyLevel: 'INTERMEDIATE',
      estimatedDuration: 600,
      isFeatured: true,
      isActive: true,
      publishedAt: iso(-10 * day),
      status: 'APPROVED',
      submittedAt: iso(-11 * day),
      reviewedAt: iso(-10 * day),
      reviewedById: 'u-admin-demo',
      reviewedByName: 'Demo Admin',
      reviewNote: 'Nội dung đầy đủ, đạt chuẩn xuất bản.',
      deactivationReason: null,
      createdAt: iso(-12 * day),
      updatedAt: iso(-10 * day),
      totalLessons: 3,
      sections: [
        {
          id: 'ms-reading-1',
          title: 'Getting started',
          description: 'Kỹ thuật đọc lướt và tìm từ khóa',
          ordering: 1,
          lessons: [
            {
              id: 'ml-reading-1',
              sectionId: 'ms-reading-1',
              title: 'Introduction to IELTS Reading',
              lessonType: 'VIDEO',
              videoUrl: 'https://example.com/videos/reading-intro.mp4',
              videoDuration: 540,
              documentUrl: 'https://example.com/docs/reading-intro.pdf',
              ordering: 1,
              isPreview: true,
              status: 'APPROVED',
              submittedAt: iso(-11 * day),
              reviewedAt: iso(-10 * day),
              reviewNote: null,
            },
            {
              id: 'ml-reading-2',
              sectionId: 'ms-reading-1',
              title: 'Heading Matching Nâng Cao',
              lessonType: 'VIDEO',
              videoUrl: 'https://example.com/videos/heading-matching.mp4',
              videoDuration: 720,
              documentUrl: null,
              ordering: 2,
              isPreview: false,
              status: 'PENDING_REVIEW',
              submittedAt: iso(-2 * day),
              reviewedAt: null,
              reviewNote: null,
            },
            {
              id: 'ml-reading-3',
              sectionId: 'ms-reading-1',
              title: 'Summary Completion Tips',
              lessonType: 'DOCUMENT',
              videoUrl: null,
              videoDuration: null,
              documentUrl: 'https://example.com/docs/summary-tips.pdf',
              ordering: 3,
              isPreview: false,
              status: 'DRAFT',
              submittedAt: null,
              reviewedAt: null,
              reviewNote: null,
            },
          ],
        },
      ],
    },
    {
      id: 'mc-speaking-pending',
      title: 'IELTS Speaking Part 2 & 3 Fluency',
      description: 'Xây dựng ý tưởng mạch lạc và phát âm tự nhiên cho bài thi Speaking.',
      thumbnail: null,
      teacherId: 'u-teacher-demo',
      teacherName: 'Nguyễn Minh Anh',
      categoryId: 'cat-academic',
      categoryName: 'Academic',
      skillFocus: 'SPEAKING',
      difficultyLevel: 'UPPER_INTERMEDIATE',
      estimatedDuration: 420,
      isFeatured: false,
      isActive: true,
      publishedAt: null,
      status: 'PENDING_REVIEW',
      submittedAt: iso(-3 * day),
      reviewedAt: null,
      reviewedById: null,
      reviewedByName: null,
      reviewNote: null,
      deactivationReason: null,
      createdAt: iso(-5 * day),
      updatedAt: iso(-3 * day),
      totalLessons: 1,
      sections: [
        {
          id: 'ms-speaking-1',
          title: 'Cue Card Strategies',
          description: 'Lập dàn ý nhanh trong 1 phút chuẩn bị',
          ordering: 1,
          lessons: [
            {
              id: 'ml-speaking-1',
              sectionId: 'ms-speaking-1',
              title: 'Cấu trúc PPF cho Part 2',
              lessonType: 'VIDEO',
              videoUrl: 'https://example.com/videos/speaking-ppf.mp4',
              videoDuration: 600,
              documentUrl: null,
              ordering: 1,
              isPreview: true,
              status: 'PENDING_REVIEW',
              submittedAt: iso(-3 * day),
              reviewedAt: null,
              reviewNote: null,
            },
          ],
        },
      ],
    },
    {
      id: 'mc-writing-draft',
      title: 'IELTS Writing Task 1 Charts & Maps',
      description: 'Phân tích biểu đồ, số liệu và cách viết tổng quan súc tích.',
      thumbnail: null,
      teacherId: 'u-teacher-demo',
      teacherName: 'Nguyễn Minh Anh',
      categoryId: 'cat-academic',
      categoryName: 'Academic',
      skillFocus: 'WRITING',
      difficultyLevel: 'INTERMEDIATE',
      estimatedDuration: 360,
      isFeatured: false,
      isActive: true,
      publishedAt: null,
      status: 'DRAFT',
      submittedAt: null,
      reviewedAt: null,
      reviewedById: null,
      reviewedByName: null,
      reviewNote: null,
      deactivationReason: null,
      createdAt: iso(-2 * day),
      updatedAt: iso(-2 * day),
      totalLessons: 1,
      sections: [
        {
          id: 'ms-writing-1',
          title: 'Line & Bar Charts',
          description: 'Từ vựng mô tả xu hướng',
          ordering: 1,
          lessons: [
            {
              id: 'ml-writing-1',
              sectionId: 'ms-writing-1',
              title: 'Viết Overview hiệu quả',
              lessonType: 'VIDEO',
              videoUrl: 'https://example.com/videos/writing-overview.mp4',
              videoDuration: 480,
              documentUrl: null,
              ordering: 1,
              isPreview: true,
              status: 'DRAFT',
              submittedAt: null,
              reviewedAt: null,
              reviewNote: null,
            },
          ],
        },
      ],
    },
    {
      id: 'mc-listening-rejected',
      title: 'IELTS Listening Section 3 & 4 Mastery',
      description: 'Luyện nghe bài giảng học thuật và thảo luận nhóm.',
      thumbnail: null,
      teacherId: 'u-teacher-demo',
      teacherName: 'Nguyễn Minh Anh',
      categoryId: 'cat-academic',
      categoryName: 'Academic',
      skillFocus: 'LISTENING',
      difficultyLevel: 'ADVANCED',
      estimatedDuration: 480,
      isFeatured: false,
      isActive: true,
      publishedAt: null,
      status: 'REJECTED',
      submittedAt: iso(-4 * day),
      reviewedAt: iso(-1 * day),
      reviewedById: 'u-admin-demo',
      reviewedByName: 'Demo Admin',
      reviewNote: 'Cần bổ sung transcript cho bài luyện nghe Section 3.',
      deactivationReason: null,
      createdAt: iso(-6 * day),
      updatedAt: iso(-1 * day),
      totalLessons: 1,
      sections: [
        {
          id: 'ms-listening-1',
          title: 'Academic Discussions',
          description: 'Theo dõi đa người nói',
          ordering: 1,
          lessons: [
            {
              id: 'ml-listening-1',
              sectionId: 'ms-listening-1',
              title: 'Nhận diện bẫy chuyển ý',
              lessonType: 'VIDEO',
              videoUrl: 'https://example.com/videos/listening-s3.mp4',
              videoDuration: 660,
              documentUrl: null,
              ordering: 1,
              isPreview: false,
              status: 'REJECTED',
              submittedAt: iso(-4 * day),
              reviewedAt: iso(-1 * day),
              reviewNote: 'Cần bổ sung transcript cho bài luyện nghe Section 3.',
            },
          ],
        },
      ],
    },
  ]
}

function seedCategories(now: number): BeCategory[] {
  const iso = new Date(now - 14 * 86_400_000).toISOString()
  return [
    {
      id: 'cat-academic',
      name: 'Academic',
      slug: 'academic',
      description: 'Luyện thi IELTS học thuật theo chuẩn đại học và nghiên cứu',
      iconUrl: null,
      isActive: true,
      ordering: 1,
      courseCount: 4,
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: 'cat-general',
      name: 'General Training',
      slug: 'general-training',
      description: 'IELTS định cư và làm việc quốc tế',
      iconUrl: null,
      isActive: true,
      ordering: 2,
      courseCount: 0,
      createdAt: iso,
      updatedAt: iso,
    },
    {
      id: 'cat-intensive',
      name: 'IELTS Intensive',
      slug: 'ielts-intensive',
      description: 'Lộ trình luyện đề tăng tốc trước kỳ thi',
      iconUrl: null,
      isActive: true,
      ordering: 3,
      courseCount: 0,
      createdAt: iso,
      updatedAt: iso,
    },
  ]
}

function seedTeacherExercises(now: number): BeTeacherExerciseDetail[] {
  const iso = new Date(now - 5 * 86_400_000).toISOString()
  return [
    {
      id: 'tex-reading-1',
      lessonId: 'ml-reading-1',
      lessonTitle: 'Introduction to IELTS Reading',
      lessonStatus: 'APPROVED',
      sectionId: 'ms-reading-1',
      sectionTitle: 'Getting started',
      courseId: 'mc-reading-approved',
      courseTitle: 'IELTS Reading Foundations',
      courseStatus: 'APPROVED',
      title: 'Reading Passage 1 - Urban Gardens',
      instruction: 'Read the passage and answer Questions 1-2.',
      audioUrl: null,
      content: {
        passageTitle: 'Urban Gardens',
        subtitle: 'How rooftop farms are changing city food supply',
        paragraphs: [
          { label: 'A', text: 'Cities have begun planting crops on unused rooftop space.' },
          { label: 'B', text: 'Planted roofs cool buildings in summer and absorb heavy rain.' },
        ],
      },
      exerciseType: 'PRACTICE',
      skillType: 'READING',
      timeLimit: 1200,
      maxAttempts: 3,
      passingScore: 1,
      ordering: 1,
      submissionCount: 0,
      totalQuestions: 2,
      createdAt: iso,
      updatedAt: iso,
      questionGroups: [
        {
          id: 'tqg-r1',
          groupTitle: 'Questions 1',
          groupInstruction: 'Choose TRUE, FALSE or NOT GIVEN.',
          questionType: 'TRUE_FALSE',
          questionRange: '1',
          ordering: 1,
          questions: [
            {
              id: 'tq-r1',
              questionText: 'Planted roofs help reduce summer heat inside buildings.',
              questionType: 'TRUE_FALSE',
              explanation: 'Paragraph B states planted roofs cool buildings in summer.',
              points: 1,
              ordering: 1,
              options: [
                { id: 'to-r1-1', optionText: 'TRUE', isCorrect: true, point: 1, ordering: 1 },
                { id: 'to-r1-2', optionText: 'FALSE', isCorrect: false, point: 0, ordering: 2 },
                { id: 'to-r1-3', optionText: 'NOT GIVEN', isCorrect: false, point: 0, ordering: 3 },
              ],
            },
          ],
        },
        {
          id: 'tqg-r2',
          groupTitle: 'Questions 2',
          groupInstruction: 'Write ONE WORD from the passage.',
          questionType: 'FILL_BLANK',
          questionRange: '2',
          ordering: 2,
          questions: [
            {
              id: 'tq-r2',
              questionText: 'Crops are grown on unused _____ space.',
              questionType: 'FILL_BLANK',
              explanation: 'Paragraph A mentions unused rooftop space.',
              points: 1,
              ordering: 2,
              options: [{ id: 'to-r2-1', optionText: 'rooftop', isCorrect: true, point: 1, ordering: 1 }],
            },
          ],
        },
      ],
    },
    {
      id: 'tex-writing-1',
      lessonId: 'ml-writing-1',
      lessonTitle: 'Viết Overview hiệu quả',
      lessonStatus: 'DRAFT',
      sectionId: 'ms-writing-1',
      sectionTitle: 'Line & Bar Charts',
      courseId: 'mc-writing-draft',
      courseTitle: 'IELTS Writing Task 1 Charts & Maps',
      courseStatus: 'DRAFT',
      title: 'Writing Task 2 - Online Education',
      instruction: 'Write at least 250 words discussing both views and giving your opinion.',
      audioUrl: null,
      content: { task: 'QT_W2_DISCUSSION' },
      exerciseType: 'PRACTICE',
      skillType: 'WRITING',
      timeLimit: 2400,
      maxAttempts: 5,
      passingScore: 0,
      ordering: 1,
      submissionCount: 0,
      totalQuestions: 1,
      createdAt: iso,
      updatedAt: iso,
      questionGroups: [
        {
          id: 'tqg-w1',
          groupTitle: 'Essay Prompt',
          questionType: 'ESSAY',
          questionRange: '1',
          ordering: 1,
          questions: [
            {
              id: 'tq-w1',
              questionText:
                'Some people believe online learning is more effective than classroom learning. Discuss both views and give your own opinion.',
              questionType: 'ESSAY',
              points: 9,
              ordering: 1,
              options: [],
            },
          ],
        },
      ],
    },
  ]
}

function seed(): DbState {
  const now = Date.now()
  const createdIso = new Date(now - 7 * 86_400_000).toISOString()
  const submissions: StoredSubmission[] = []
  for (const [exerciseId, correct, minutesAgo] of seedAttempts) {
    const ex = exercises.find((e) => e.id === exerciseId)
    if (!ex) continue
    const answers = answersWithScore(ex, correct)
    submissions.push({
      id: `sub-seed-${submissions.length + 1}`,
      userId: 'u-demo',
      exerciseId,
      attemptNumber: submissions.filter((s) => s.exerciseId === exerciseId).length + 1,
      answers,
      ...gradeExercise(ex, answers),
      timeSpent: (ex.timeLimit ?? 300) * 0.7,
      submittedAt: new Date(now - minutesAgo * 60_000).toISOString(),
    })
  }
  return {
    version: VERSION,
    users: [
      ...seedUsers.map((u) => ({
        ...u,
        username: 'student_enrolled',
        password: DEMO_PASSWORD,
        status: 'ACTIVE' as const,
        isActive: true,
        emailVerified: true,
        lockReason: null,
        createdAt: createdIso,
        updatedAt: createdIso,
      })),
      {
        id: 'u-admin-demo',
        username: 'admin_demo',
        email: 'admin.demo@ielts-graph.local',
        fullName: 'Demo Admin',
        password: 'Demo@123',
        avatarUrl: null,
        bio: null,
        phone: null,
        role: 'ADMIN',
        status: 'ACTIVE',
        isActive: true,
        emailVerified: true,
        lockReason: null,
        createdAt: createdIso,
        updatedAt: createdIso,
      },
      {
        id: 'u-teacher-demo',
        username: 'teacher_demo',
        email: 'teacher.demo@ielts-graph.local',
        fullName: 'Nguyễn Minh Anh',
        password: 'Demo@123',
        avatarUrl: null,
        bio: 'Giảng viên IELTS 8.5 chuyên Reading & Speaking',
        phone: '0901234567',
        role: 'TEACHER',
        status: 'ACTIVE',
        isActive: true,
        emailVerified: true,
        lockReason: null,
        createdAt: createdIso,
        updatedAt: createdIso,
      },
      {
        id: 'u-teacher-other',
        username: 'teacher_other',
        email: 'teacher.other@ielts-graph.local',
        fullName: 'Trần Hoàng Long',
        password: 'Demo@123',
        avatarUrl: null,
        bio: 'Giảng viên IELTS Writing',
        phone: null,
        role: 'TEACHER',
        status: 'ACTIVE',
        isActive: true,
        emailVerified: true,
        lockReason: null,
        createdAt: createdIso,
        updatedAt: createdIso,
      },
      {
        id: 'u-teacher-pending',
        username: 'teacher_pending',
        email: 'teacher.pending@ielts-graph.local',
        fullName: 'Lê Thu Hà',
        password: 'Demo@123',
        avatarUrl: null,
        bio: 'Ứng viên giảng viên Listening',
        phone: '0987654321',
        role: 'TEACHER',
        status: 'PENDING',
        isActive: false,
        emailVerified: true,
        lockReason: null,
        createdAt: new Date(now - 86_400_000).toISOString(),
        updatedAt: new Date(now - 86_400_000).toISOString(),
      },
      {
        id: 'u-student-locked',
        username: 'student_locked',
        email: 'student.locked@ielts-graph.local',
        fullName: 'Phạm Quốc Bảo',
        password: 'Demo@123',
        avatarUrl: null,
        bio: null,
        phone: '0912345670',
        role: 'STUDENT',
        status: 'LOCKED',
        isActive: false,
        emailVerified: true,
        lockReason: 'Vi phạm nội quy cộng đồng',
        createdAt: new Date(now - 2 * 86_400_000).toISOString(),
        updatedAt: new Date(now - 86_400_000).toISOString(),
      },
    ],
    submissions,
    categories: seedCategories(now),
    moderationCourses: seedModerationCourses(now),
    teacherExercises: seedTeacherExercises(now),
  }
}

function load(): DbState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.version === VERSION) return parsed
    }
  } catch {
    // Corrupt or unavailable storage: start from seed data.
  }
  return seed()
}

export const db: DbState = load()

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // Storage may be unavailable (private mode); the mock still works in memory.
  }
}

export function resetDb() {
  const fresh = seed()
  db.users = fresh.users
  db.submissions = fresh.submissions
  db.categories = fresh.categories
  db.moderationCourses = fresh.moderationCourses
  db.teacherExercises = fresh.teacherExercises
  persist()
}
