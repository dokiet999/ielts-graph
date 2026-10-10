package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.LessonDetailResponse;
import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.Section;
import com.ielts.backend.entity.User;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.mapper.LessonMapper;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.SectionRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.CourseAccessService;
import com.ielts.backend.service.LessonService;
import com.ielts.backend.service.progress.ExerciseStats;
import com.ielts.backend.service.progress.LearningProgressReader;
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
    private final SectionRepository sectionRepository;
    private final ExerciseRepository exerciseRepository;
    private final UserRepository userRepository;
    private final CourseAccessService courseAccessService;
    private final LearningProgressReader progressReader;
    private final LessonMapper lessonMapper;

    @Override
    public LessonDetailResponse getLessonDetail(UUID lessonId, String username) {
        Lesson lesson = lessonRepository.findVisibleByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        courseAccessService.checkLessonAccess(lesson, username);

        Course course = lesson.getSection().getCourse();
        return LessonDetailResponse.builder()
                .lesson(lessonMapper.toResponse(lesson))
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .sectionId(lesson.getSection().getId())
                .sectionTitle(lesson.getSection().getTitle())
                // Exercises without questions are listed too; clients decide whether to show them
                .exercises(summarize(exerciseRepository.findByLessonIdOrderByOrderingAsc(lessonId), username))
                .build();
    }

    @Override
    public List<ExerciseSummaryResponse> getSectionExercises(UUID sectionId, String username) {
        Section section = sectionRepository.findByIdWithCourse(sectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));
        courseAccessService.checkSectionAccess(section, username);

        return summarize(exerciseRepository.findBySectionIdOrdered(sectionId), username);
    }

    /** Adds question counts and the user's attempts with two grouped queries for the whole list. */
    private List<ExerciseSummaryResponse> summarize(List<Exercise> exercises, String username) {
        UUID userId = username == null ? null
                : userRepository.findByUsername(DbUserDetailsService.normalize(username)).map(User::getId).orElse(null);
        Map<UUID, ExerciseStats> stats = progressReader.exerciseStats(
                exercises.stream().map(Exercise::getId).toList(), userId);
        return exercises.stream()
                .map(e -> lessonMapper.toExerciseSummary(e, stats.getOrDefault(e.getId(), ExerciseStats.EMPTY)))
                .toList();
    }
}
