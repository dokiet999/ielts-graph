import { useOutletContext } from 'react-router-dom'
import type { CourseDetail, Section } from '@/lib/types'

export interface CourseContext {
  course: CourseDetail
  section: Section
}

/** Course and current stage, provided by CourseLayout to the pages inside a course. */
export const useCourseContext = () => useOutletContext<CourseContext>()
