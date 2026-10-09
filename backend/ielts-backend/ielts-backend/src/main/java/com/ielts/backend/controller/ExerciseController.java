package com.ielts.backend.controller;

import com.ielts.backend.dto.request.ExerciseFilter;
import com.ielts.backend.dto.response.ExerciseDetailResponse;
import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.service.ExerciseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
@Tag(name = "Exercises", description = "Browse practice exercises and open an exercise to answer")
public class ExerciseController {

    private static final int MAX_PAGE_SIZE = 100;

    private final ExerciseService exerciseService;

    @GetMapping
    @Operation(summary = "List standalone practice exercises, filtered by skill, level, question type and title keyword")
    public PageResponse<ExerciseSummaryResponse> getExercises(
            @RequestParam(required = false) SkillType skill,
            @RequestParam(required = false) DifficultyLevel level,
            @RequestParam(required = false) QuestionType questionType,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                // id as tie-breaker keeps paging stable when exercises share created_at
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id")));
        return exerciseService.getExercises(new ExerciseFilter(skill, level, questionType, q), pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Exercise with its questions, without answers. Lesson exercises require enrollment (FR-2.01)")
    public ExerciseDetailResponse getExerciseDetail(@PathVariable UUID id,
                                                    @AuthenticationPrincipal UserDetails principal) {
        return exerciseService.getExerciseDetail(id, principal != null ? principal.getUsername() : null);
    }
}
