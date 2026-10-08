package com.ielts.backend.mapper;

import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.LessonResponse;
import com.ielts.backend.dto.response.LessonSummaryResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import org.springframework.stereotype.Component;

@Component
public class LessonMapper {

    public LessonSummaryResponse toSummary(Lesson lesson) {
        return LessonSummaryResponse.builder()
                .id(lesson.getId())
                .sectionId(lesson.getSection().getId())
                .title(lesson.getTitle())
                .lessonType(lesson.getLessonType())
                .videoDuration(lesson.getVideoDuration())
                .ordering(lesson.getOrdering())
                .isPreview(lesson.getIsPreview())
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

    public ExerciseSummaryResponse toExerciseSummary(Exercise exercise) {
        return ExerciseSummaryResponse.builder()
                .id(exercise.getId())
                .title(exercise.getTitle())
                .exerciseType(exercise.getExerciseType())
                .skillType(exercise.getSkillType())
                .timeLimit(exercise.getTimeLimit())
                .ordering(exercise.getOrdering())
                .build();
    }
}
