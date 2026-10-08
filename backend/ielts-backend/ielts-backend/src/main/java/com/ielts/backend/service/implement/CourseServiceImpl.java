package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.CourseDetailResponse;
import com.ielts.backend.dto.response.CourseResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.dto.response.SectionWithLessonsResponse;
import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Section;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.mapper.CourseMapper;
import com.ielts.backend.mapper.LessonMapper;
import com.ielts.backend.repository.CourseRepository;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.SectionRepository;
import com.ielts.backend.service.CourseService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final SectionRepository sectionRepository;
    private final LessonRepository lessonRepository;
    private final CourseMapper courseMapper;
    private final LessonMapper lessonMapper;

    @Override
    public PageResponse<CourseResponse> getCourses(SkillType skill, Pageable pageable) {
        Page<Course> page = skill == null
                ? courseRepository.findByIsActiveTrue(pageable)
                : courseRepository.findByIsActiveTrueAndSkillFocus(skill, pageable);
        return PageResponse.of(page, courseMapper::toResponse);
    }

    @Override
    public CourseDetailResponse getCourseDetail(UUID courseId) {
        Course course = courseRepository.findByIdAndIsActiveTrue(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", courseId));

        List<Section> sections = sectionRepository.findByCourseIdOrderByOrderingAsc(courseId);
        // One query for all lessons of the course, then group them by section in memory
        List<LessonSummaryResponse> lessons = lessonRepository.findAllByCourseIdOrdered(courseId).stream()
                .map(lessonMapper::toSummary)
                .toList();
        Map<UUID, List<LessonSummaryResponse>> lessonsBySection = lessons.stream()
                .collect(Collectors.groupingBy(LessonSummaryResponse::getSectionId));

        List<SectionWithLessonsResponse> sectionResponses = sections.stream()
                .map(s -> courseMapper.toSectionWithLessons(s, lessonsBySection.getOrDefault(s.getId(), List.of())))
                .toList();

        return CourseDetailResponse.builder()
                .course(courseMapper.toResponse(course))
                .totalLessons(lessons.size())
                .sections(sectionResponses)
                .build();
    }

    @Override
    public List<LessonSummaryResponse> getCourseLessons(UUID courseId) {
        if (!courseRepository.existsByIdAndIsActiveTrue(courseId)) {
            throw new ResourceNotFoundException("Course", courseId);
        }
        return lessonRepository.findAllByCourseIdOrdered(courseId).stream()
                .map(lessonMapper::toSummary)
                .toList();
    }
}
