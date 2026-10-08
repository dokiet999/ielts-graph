package com.ielts.backend.mapper;

import com.ielts.backend.dto.response.CourseResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.dto.response.SectionWithLessonsResponse;
import com.ielts.backend.entity.Course;
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

    public SectionWithLessonsResponse toSectionWithLessons(Section section, List<LessonSummaryResponse> lessons) {
        return SectionWithLessonsResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .ordering(section.getOrdering())
                .lessons(lessons)
                .build();
    }
}
