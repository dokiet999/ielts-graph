package com.ielts.backend.service;

import com.ielts.backend.dto.request.ExerciseRequest;
import com.ielts.backend.dto.response.ExerciseDetailPracticeResponse;
import com.ielts.backend.dto.response.ExerciseResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ExerciseService {

    Page<ExerciseResponse> getExercises(SkillType skill, ExerciseType type, Pageable pageable);

    /** Practice view for the given user (answers hidden); throws when the user may not open the exercise. */
    ExerciseDetailPracticeResponse getExerciseForPractice(UUID id, String username);

    ExerciseResponse getExercise(UUID id);

    ExerciseResponse createExercise(ExerciseRequest request);
}
