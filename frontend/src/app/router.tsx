import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { CourseLayout } from '@/layouts/CourseLayout'
import { RequireAuth, GuestOnly } from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/home/HomePage'
import { CourseListPage } from '@/features/courses/CourseListPage'
import { CourseDetailPage } from '@/features/courses/CourseDetailPage'
import { OverviewPage } from '@/features/learning/OverviewPage'
import { SyllabusPage } from '@/features/learning/SyllabusPage'
import { LessonPage } from '@/features/learning/LessonPage'
import { ExercisesPage } from '@/features/learning/ExercisesPage'
import { CourseInfoPage } from '@/features/learning/CourseInfoPage'
import { RunnerPage } from '@/features/runner/RunnerPage'
import { ResultPage } from '@/features/submissions/ResultPage'
import { ReviewPage } from '@/features/submissions/ReviewPage'
import { HistoryPage } from '@/features/submissions/HistoryPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { NotFoundPage } from '@/features/NotFoundPage'
import { RouteError } from '@/features/RouteError'
import { DEMO_MODE } from '@/lib/demo'

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <HomePage /> },
              { path: '/courses', element: <CourseListPage /> },
              { path: '/courses/:courseId', element: <CourseDetailPage /> },
              { path: '/history', element: <HistoryPage /> },
              {
                path: '/profile',
                element: DEMO_MODE ? <Navigate to="/" replace /> : <ProfilePage />,
              },
              { path: '/submissions/:submissionId', element: <ResultPage /> },
            ],
          },
          {
            path: '/learn/:courseId/:sectionId',
            element: <CourseLayout />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: 'overview', element: <OverviewPage /> },
              { path: 'syllabus', element: <SyllabusPage /> },
              { path: 'lessons/:lessonId', element: <LessonPage /> },
              { path: 'exercises', element: <ExercisesPage /> },
              { path: 'info', element: <CourseInfoPage /> },
            ],
          },
          // Full-screen pages without navigation chrome.
          { path: '/run/:exerciseId', element: <RunnerPage /> },
          { path: '/submissions/:submissionId/review', element: <ReviewPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
