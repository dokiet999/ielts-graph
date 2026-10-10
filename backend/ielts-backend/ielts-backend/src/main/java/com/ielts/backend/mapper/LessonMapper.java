package com.ielts.backend.mapper;

import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.LessonResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.service.progress.ExerciseStats;
import org.springframework.stereotype.Component;

@Component
public class LessonMapper {

    /**
     * @param exerciseCount exercises of the lesson that count towards progress
     */
    public LessonSummaryResponse toSummary(Lesson lesson, int exerciseCount) {
        return LessonSummaryResponse.builder()
                .id(lesson.getId())
                .sectionId(lesson.getSection().getId())
                .title(lesson.getTitle())
                .lessonType(lesson.getLessonType())
                .videoDuration(lesson.getVideoDuration())
                .ordering(lesson.getOrdering())
                .isPreview(lesson.getIsPreview())
                .exerciseCount(exerciseCount)
                .build();
    }

    public LessonResponse toResponse(Lesson lesson) {
        return LessonResponse.builder()
                .id(lesson.getId())
                .sectionId(lesson.getSection().getId())
                .title(lesson.getTitle())
                .lessonType(lesson.getLessonType())
                .videoUrl(lesson.getVideoUrl())
                .videoDuration(lesson.getVideoDuration())
                .documentUrl(lesson.getDocumentUrl())
                .ordering(lesson.getOrdering())
                .isPreview(lesson.getIsPreview())
                .createdAt(lesson.getCreatedAt())
                .updatedAt(lesson.getUpdatedAt())
                .build();
    }

    /**
     * The exercise must belong to a lesson whose section is already loaded.
     */
    public ExerciseSummaryResponse toExerciseSummary(Exercise exercise, ExerciseStats stats) {
        Lesson lesson = exercise.getLesson();
        return ExerciseSummaryResponse.builder()
                .id(exercise.getId())
                .title(exercise.getTitle())
                .exerciseType(exercise.getExerciseType())
                .skillType(exercise.getSkillType())
                .timeLimit(exercise.getTimeLimit())
                .ordering(exercise.getOrdering())
                .lessonId(lesson.getId())
                .lessonTitle(lesson.getTitle())
                .sectionId(lesson.getSection().getId())
                .courseId(lesson.getSection().getCourse().getId())
                .questionCount(stats.questionCount())
                .maxScore(stats.maxScore())
                .attemptCount(stats.attemptCount())
                .bestScore(stats.bestScore())
                .lastSubmissionId(stats.lastSubmissionId())
                .build();
    }
}
