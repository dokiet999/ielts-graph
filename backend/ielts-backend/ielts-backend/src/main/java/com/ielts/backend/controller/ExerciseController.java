package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.constant.PaginationConstants;
import com.ielts.backend.dto.request.ExerciseRequest;
import com.ielts.backend.dto.response.ExerciseDetailPracticeResponse;
import com.ielts.backend.dto.response.ExerciseResponse;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.service.ExerciseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
@Tag(name = "Exercises", description = "Browse and practice IELTS exercises")
public class ExerciseController {

    private final ExerciseService exerciseService;

    @GetMapping
    @Operation(summary = "List exercises filtered by skill and type with pagination")
    public BaseResponse<List<ExerciseResponse>> getExercises(
            @RequestParam(required = false) SkillType skill,
            @RequestParam(required = false) ExerciseType type,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_PAGE_STR) int page,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_SIZE_STR) int size) {
        PageRequest pageable = PaginationConstants.of(
                page,
                size,
                Sort.by(Sort.Direction.ASC, "ordering")
                        .and(Sort.by(Sort.Direction.DESC, "createdAt"))
                        .and(Sort.by(Sort.Direction.ASC, "id")));
        return BaseResponse.ofSuccess(exerciseService.getExercises(skill, type, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get exercise detail for practice with question groups and questions (answers hidden)")
    public BaseResponse<ExerciseDetailPracticeResponse> getExerciseForPractice(@PathVariable UUID id) {
        return BaseResponse.ofSuccess(exerciseService.getExerciseForPractice(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new exercise (Teachers and Admins)")
    public BaseResponse<ExerciseResponse> createExercise(@Valid @RequestBody ExerciseRequest request) {
        ExerciseResponse response = exerciseService.createExercise(request);
        return BaseResponse.ofCreated(response);
    }
}
