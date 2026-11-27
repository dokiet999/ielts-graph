import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { CourseLayout } from '@/layouts/CourseLayout'
import { AdminLayout, TeacherLayout } from '@/layouts/RoleShellLayout'
import { RequireAuth, RequireRole, GuestOnly } from '@/features/auth/guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/home/HomePage'
import { CourseListPage } from '@/features/courses/CourseListPage'
import { CourseDetailPage } from '@/features/courses/CourseDetailPage'
import { OverviewPage } from '@/features/learning/OverviewPage'
import { SyllabusPage } from '@/features/learning/SyllabusPage'
import { LessonPage } from '@/features/learning/LessonPage'
import { ExercisesPage } from '@/features/learning/ExercisesPage'
import { MockTestsPage } from '@/features/learning/MockTestsPage'
import { FinalTestPage } from '@/features/learning/FinalTestPage'
import { CourseInfoPage } from '@/features/learning/CourseInfoPage'
import { RunnerPage } from '@/features/runner/RunnerPage'
import { ResultPage } from '@/features/submissions/ResultPage'
import { ReviewPage } from '@/features/submissions/ReviewPage'
import { HistoryPage } from '@/features/submissions/HistoryPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage'
import { AdminReviewsPage } from '@/features/admin/AdminReviewsPage'
import { AdminCoursesPage } from '@/features/admin/AdminCoursesPage'
import { AdminCoursePreviewPage } from '@/features/admin/AdminCoursePreviewPage'
import { AdminStudentDetailPage } from '@/features/admin/AdminStudentDetailPage'
import { AdminCategoriesPage } from '@/features/admin/AdminCategoriesPage'
import { AdminTeachersPage } from '@/features/admin/AdminTeachersPage'
import { AdminStudentsPage } from '@/features/admin/AdminStudentsPage'
import { TeacherCourseDetailPage } from '@/features/teacher/TeacherCourseDetailPage'
import { TeacherCoursesPage } from '@/features/teacher/TeacherCoursesPage'
import { TeacherCourseStudentsPage } from '@/features/teacher/TeacherCourseStudentsPage'
import { TeacherDashboardPage } from '@/features/teacher/TeacherDashboardPage'
import { TeacherExerciseEditorPage } from '@/features/teacher/TeacherExerciseEditorPage'
import { TeacherLessonExercisesPage } from '@/features/teacher/TeacherLessonExercisesPage'
import { TeacherStudentDetailPage } from '@/features/teacher/TeacherStudentDetailPage'
import { TeacherSubmissionReviewPage } from '@/features/teacher/TeacherSubmissionReviewPage'
import { PersonalizationPage } from '@/features/personalization/PersonalizationPage'
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
            element: <RequireRole allow={['STUDENT']} />,
            children: [
              {
                element: <AppLayout />,
                children: [
                  { path: '/', element: <HomePage /> },
                  { path: '/courses', element: <CourseListPage /> },
                  { path: '/courses/:courseId', element: <CourseDetailPage /> },
                  { path: '/history', element: <HistoryPage /> },
                  { path: '/personalization', element: <PersonalizationPage /> },
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
                  { path: 'mock-tests', element: <MockTestsPage /> },
                  { path: 'final-test', element: <FinalTestPage /> },
                  { path: 'info', element: <CourseInfoPage /> },
                ],
              },
              // Full-screen pages without navigation chrome.
              { path: '/run/:exerciseId', element: <RunnerPage /> },
              { path: '/submissions/:submissionId/review', element: <ReviewPage /> },
            ],
          },
          {
            path: '/admin',
            element: <RequireRole allow={['ADMIN']} />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, element: <AdminDashboardPage /> },
                  { path: 'reviews', element: <AdminReviewsPage /> },
                  { path: 'courses', element: <AdminCoursesPage /> },
                  { path: 'courses/:courseId', element: <AdminCoursePreviewPage /> },
                  {
                    path: 'courses/:courseId/students/:studentId',
                    element: <AdminStudentDetailPage />,
                  },
                  { path: 'categories', element: <AdminCategoriesPage /> },
                  { path: 'teachers', element: <AdminTeachersPage /> },
                  { path: 'students', element: <AdminStudentsPage /> },
                ],
              },
            ],
          },
          {
            path: '/teacher',
            element: <RequireRole allow={['TEACHER']} />,
            children: [
              {
                element: <TeacherLayout />,
                children: [
                  { index: true, element: <TeacherDashboardPage /> },
                  { path: 'courses', element: <TeacherCoursesPage /> },
                  { path: 'courses/:courseId', element: <TeacherCourseDetailPage /> },
                  { path: 'courses/:courseId/students', element: <TeacherCourseStudentsPage /> },
                  {
                    path: 'courses/:courseId/students/:studentId',
                    element: <TeacherStudentDetailPage />,
                  },
                  { path: 'lessons/:lessonId/exercises', element: <TeacherLessonExercisesPage /> },
                  { path: 'exercises/:exerciseId', element: <TeacherExerciseEditorPage /> },
                  { path: 'submissions/:submissionId', element: <TeacherSubmissionReviewPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
