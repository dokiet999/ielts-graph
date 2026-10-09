import reading01 from '@data/exercises/reading/reading-01.json'
import listening01 from '@data/exercises/listening/listening-01.json'
import type {
  DifficultyLevel,
  EnrollmentStatus,
  Exercise,
  Lesson,
  Teacher,
  User,
} from '@/lib/types'
import { buildExercise, type RawExercise } from './raw'
import {
  listeningLibrary,
  quizLinking,
  quizListeningTraps,
  quizTfng,
  readingPencil,
} from './authored'

export const DEMO_PASSWORD = '123456'

export const seedUsers: User[] = [
  {
    id: 'u-demo',
    email: 'demo@ielts.dev',
    fullName: 'Học viên Demo',
    avatarUrl: null,
    bio: null,
    phone: null,
    role: 'STUDENT',
  },
]

const teachers: Record<string, Teacher> = {
  minhAnh: { id: 't-1', fullName: 'Nguyễn Minh Anh', avatarUrl: null },
  hoangLong: { id: 't-2', fullName: 'Trần Hoàng Long', avatarUrl: null },
}

// Public-domain sample clip used as a placeholder lesson video.
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

export interface CourseRecord {
  id: string
  title: string
  description: string
  level: DifficultyLevel
  categoryName: string
  teacher: Teacher
  estimatedDuration: number
  enrollmentStatus: EnrollmentStatus
  enrolledAt: string
  completedAt: string | null
  sections: { id: string; title: string; description: string; lessons: Lesson[] }[]
}

const lesson = (
  id: string,
  sectionId: string,
  ordering: number,
  title: string,
  lessonType: Lesson['lessonType'] = 'VIDEO',
): Lesson => ({
  id,
  sectionId,
  title,
  lessonType,
  ordering,
  videoUrl: lessonType === 'VIDEO' ? SAMPLE_VIDEO : null,
  videoDuration: lessonType === 'VIDEO' ? 600 : null,
  documentUrl: null,
  exerciseCount: 0,
})

export const courses: CourseRecord[] = [
  {
    id: 'c-foundation',
    title: 'IELTS Foundation 5.0 - Reading & Listening',
    description:
      'Khóa nền tảng giúp học viên làm quen với cấu trúc đề Reading và Listening, nắm các dạng câu hỏi phổ biến và chiến thuật làm bài cơ bản.',
    level: 'INTERMEDIATE',
    categoryName: 'IELTS Academic',
    teacher: teachers.minhAnh,
    estimatedDuration: 24,
    enrollmentStatus: 'IN_PROGRESS',
    enrolledAt: '2026-09-01T08:00:00Z',
    completedAt: null,
    sections: [
      {
        id: 's-f1',
        title: 'Reading nền tảng',
        description: 'Skimming, scanning và các dạng câu hỏi Reading cơ bản.',
        lessons: [
          lesson('l-f1-1', 's-f1', 1, 'Kỹ năng skimming & scanning'),
          lesson('l-f1-2', 's-f1', 2, 'Dạng True / False / Not Given'),
        ],
      },
      {
        id: 's-f2',
        title: 'Listening nền tảng',
        description: 'Nghe điền form, nghe mô tả địa điểm và các bẫy thường gặp.',
        lessons: [
          lesson('l-f2-1', 's-f2', 1, 'Nghe điền form & ghi chú'),
          lesson('l-f2-2', 's-f2', 2, 'Nghe mô tả địa điểm'),
        ],
      },
    ],
  },
  {
    id: 'c-intensive',
    title: 'IELTS Intensive 6.5 - Reading & Listening',
    description:
      'Khóa luyện chuyên sâu với đề dài, thời gian thực và các dạng câu hỏi khó như Matching Headings.',
    level: 'UPPER_INTERMEDIATE',
    categoryName: 'IELTS Academic',
    teacher: teachers.hoangLong,
    estimatedDuration: 30,
    enrollmentStatus: 'IN_PROGRESS',
    enrolledAt: '2026-09-15T08:00:00Z',
    completedAt: null,
    sections: [
      {
        id: 's-i1',
        title: 'Reading chuyên sâu',
        description: 'Matching headings và câu hỏi chọn nhiều đáp án.',
        lessons: [lesson('l-i1-1', 's-i1', 1, 'Matching headings')],
      },
      {
        id: 's-i2',
        title: 'Listening chuyên sâu',
        description: 'Section 2 – độc thoại về địa điểm và dịch vụ.',
        lessons: [lesson('l-i2-1', 's-i2', 1, 'Section 2: mô tả địa điểm')],
      },
    ],
  },
  {
    id: 'c-starter',
    title: 'IELTS Starter 4.0',
    description: 'Khóa khởi động cho người mới bắt đầu làm quen với IELTS.',
    level: 'ELEMENTARY',
    categoryName: 'IELTS Academic',
    teacher: teachers.minhAnh,
    estimatedDuration: 12,
    enrollmentStatus: 'COMPLETED',
    enrolledAt: '2026-06-01T08:00:00Z',
    completedAt: '2026-08-20T08:00:00Z',
    sections: [
      {
        id: 's-st1',
        title: 'Làm quen Reading & Listening',
        description: 'Từ nối, paraphrase và các bẫy Listening.',
        lessons: [
          lesson('l-st1-1', 's-st1', 1, 'Từ nối và paraphrase', 'TEXT'),
          lesson('l-st1-2', 's-st1', 2, 'Bẫy trong Listening', 'TEXT'),
        ],
      },
    ],
  },
]

const place = (
  id: string,
  courseId: string,
  sectionId: string,
  lessonId: string,
  title?: string,
) => ({
  id,
  courseId,
  sectionId,
  lessonId,
  title,
})

const r = (x: unknown) => x as RawExercise

export const exercises: Exercise[] = [
  buildExercise(quizLinking, place('ex-quiz-linking', 'c-foundation', 's-f1', 'l-f1-1')),
  buildExercise(r(reading01), place('ex-reading-01', 'c-foundation', 's-f1', 'l-f1-1')),
  buildExercise(quizTfng, place('ex-quiz-tfng', 'c-foundation', 's-f1', 'l-f1-2')),
  buildExercise(readingPencil, place('ex-reading-pencil', 'c-foundation', 's-f1', 'l-f1-2')),
  buildExercise(quizListeningTraps, place('ex-quiz-traps', 'c-foundation', 's-f2', 'l-f2-1')),
  buildExercise(r(listening01), place('ex-listening-01', 'c-foundation', 's-f2', 'l-f2-1')),
  buildExercise(listeningLibrary, place('ex-listening-library', 'c-foundation', 's-f2', 'l-f2-2')),

  buildExercise(readingPencil, place('ex-i-reading-pencil', 'c-intensive', 's-i1', 'l-i1-1')),
  buildExercise(r(reading01), place('ex-i-reading-01', 'c-intensive', 's-i1', 'l-i1-1')),
  buildExercise(listeningLibrary, place('ex-i-listening-library', 'c-intensive', 's-i2', 'l-i2-1')),

  buildExercise(quizLinking, place('ex-st-linking', 'c-starter', 's-st1', 'l-st1-1')),
  buildExercise(quizTfng, place('ex-st-tfng', 'c-starter', 's-st1', 'l-st1-1')),
  buildExercise(quizListeningTraps, place('ex-st-traps', 'c-starter', 's-st1', 'l-st1-2')),
]

/** Submissions created when the mock DB is first initialised: [exerciseId, correct answers, minutes ago]. */
export const seedAttempts: [string, number, number][] = [
  ['ex-st-linking', 5, 60 * 24 * 60],
  ['ex-st-tfng', 3, 60 * 24 * 58],
  ['ex-st-traps', 4, 60 * 24 * 55],
  ['ex-quiz-linking', 4, 60 * 24 * 3],
  ['ex-reading-01', 8, 60 * 24 * 2],
  ['ex-reading-01', 10, 60 * 24],
  ['ex-quiz-traps', 3, 60 * 5],
]
