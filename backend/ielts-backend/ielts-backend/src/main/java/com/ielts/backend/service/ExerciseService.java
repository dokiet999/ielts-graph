package com.ielts.backend.service;

import com.ielts.backend.dto.request.ExerciseFilter;
import com.ielts.backend.dto.response.ExerciseDetailResponse;
import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.PageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ExerciseService {

    /** Standalone practice exercises (UC11). Lesson exercises are listed in the lesson detail. */
    PageResponse<ExerciseSummaryResponse> getExercises(ExerciseFilter filter, Pageable pageable);

    /**
     * The exercise with its questions, without answer keys, ready to be answered (UC09, UC12).
     *
     * @param username the logged-in user, or null for anonymous access
     */
    ExerciseDetailResponse getExerciseDetail(UUID exerciseId, String username);
}
