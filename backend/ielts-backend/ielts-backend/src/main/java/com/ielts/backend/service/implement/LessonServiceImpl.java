package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.LessonDetailResponse;
import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.mapper.ExerciseMapper;
import com.ielts.backend.mapper.LessonMapper;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.service.CourseAccessService;
import com.ielts.backend.service.LessonService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LessonServiceImpl implements LessonService {

    private final LessonRepository lessonRepository;
    private final ExerciseRepository exerciseRepository;
    private final CourseAccessService courseAccessService;
    private final QuestionRepository questionRepository;
    private final LessonMapper lessonMapper;
    private final ExerciseMapper exerciseMapper;

    @Override
    public LessonDetailResponse getLessonDetail(UUID lessonId, String username) {
        Lesson lesson = lessonRepository.findVisibleByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        courseAccessService.checkLessonAccess(lesson, username);

        Course course = lesson.getSection().getCourse();
        List<Exercise> exercises = exerciseRepository.findByLessonIdOrderByOrderingAsc(lessonId);
        Map<UUID, Long> questionCounts =
                questionRepository.countMapByExerciseIds(exercises.stream().map(Exercise::getId).toList());
        return LessonDetailResponse.builder()
                .lesson(lessonMapper.toResponse(lesson))
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .sectionId(lesson.getSection().getId())
                .sectionTitle(lesson.getSection().getTitle())
                .exercises(exercises.stream()
                        .map(e -> exerciseMapper.toSummary(e, questionCounts.getOrDefault(e.getId(), 0L)))
                        .toList())
                .build();
    }
}
