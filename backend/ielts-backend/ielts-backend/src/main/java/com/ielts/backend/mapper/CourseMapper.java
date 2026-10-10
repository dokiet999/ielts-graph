package com.ielts.backend.mapper;

import com.ielts.backend.dto.response.CourseResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.dto.response.MyCourseResponse;
import com.ielts.backend.dto.response.SectionWithLessonsResponse;
import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Enrollment;
import com.ielts.backend.entity.Section;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class CourseMapper {

    /**
     * @param enrollmentCount active enrollments, counted from the enrollments table
     *                        (the courses.enrollment_count column is not maintained)
     */
    public CourseResponse toResponse(Course course, long enrollmentCount) {
        return CourseResponse.builder()
                .id(course.getId())
                .teacherId(course.getTeacher().getId())
                .teacherName(course.getTeacher().getFullName())
                .categoryId(course.getCategory() != null ? course.getCategory().getId() : null)
                .categoryName(course.getCategory() != null ? course.getCategory().getName() : null)
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnail(course.getThumbnail())
                .skillFocus(course.getSkillFocus())
                .difficultyLevel(course.getDifficultyLevel())
                .estimatedDuration(course.getEstimatedDuration())
                .isFeatured(course.getIsFeatured())
                .enrollmentCount(Math.toIntExact(enrollmentCount))
                .rating(course.getRating())
                .courseOutline(course.getCourseOutline())
                .publishedAt(course.getPublishedAt())
                .isActive(course.getIsActive())
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt())
                .build();
    }

    /**
     * @param completedExerciseCount null for anonymous access
     */
    public SectionWithLessonsResponse toSectionWithLessons(Section section, List<LessonSummaryResponse> lessons,
                                                           int exerciseCount, Integer completedExerciseCount) {
        return SectionWithLessonsResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .ordering(section.getOrdering())
                .lessons(lessons)
                .exerciseCount(exerciseCount)
                .completedExerciseCount(completedExerciseCount)
                .build();
    }

    /** The enrollment's course must be loaded with its teacher and category. */
    public MyCourseResponse toMyCourse(Enrollment enrollment, int sectionCount,
                                       int exerciseCount, int completedExerciseCount) {
        Course course = enrollment.getCourse();
        return MyCourseResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .thumbnail(course.getThumbnail())
                .difficultyLevel(course.getDifficultyLevel())
                .skillFocus(course.getSkillFocus())
                .categoryName(course.getCategory() != null ? course.getCategory().getName() : null)
                .teacherId(course.getTeacher().getId())
                .teacherName(course.getTeacher().getFullName())
                .estimatedDuration(course.getEstimatedDuration())
                .enrolledAt(enrollment.getEnrollmentDate())
                .completedAt(enrollment.getCompletionDate())
                .sectionCount(sectionCount)
                .exerciseCount(exerciseCount)
                .completedExerciseCount(completedExerciseCount)
                .build();
    }
}
