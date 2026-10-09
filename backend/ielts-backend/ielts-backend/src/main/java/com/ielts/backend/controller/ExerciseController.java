package com.ielts.backend.controller;

import com.ielts.backend.dto.request.ExerciseRequest;
import com.ielts.backend.dto.request.ListeningSubmissionRequest;
import com.ielts.backend.dto.response.ExerciseDetailPracticeResponse;
import com.ielts.backend.dto.response.ExerciseResponse;
import com.ielts.backend.dto.response.PageResponse;
import com.ielts.backend.dto.response.SubmissionResponse;
import com.ielts.backend.dto.response.SubmissionResultResponse;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.service.ExerciseService;
import com.ielts.backend.service.SubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
@Tag(name = "Exercises", description = "Browse, practice and submit IELTS exercises")
public class ExerciseController {

    private static final int MAX_PAGE_SIZE = 100;

    private final ExerciseService exerciseService;
    private final SubmissionService submissionService;

    @GetMapping
    @Operation(summary = "List exercises filtered by skill and type with pagination")
    public PageResponse<ExerciseResponse> getExercises(
            @RequestParam(required = false) SkillType skill,
            @RequestParam(required = false) ExerciseType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.ASC, "ordering").and(Sort.by(Sort.Direction.DESC, "createdAt")));
        return exerciseService.getExercises(skill, type, pageable);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get exercise detail for practice with question groups and questions (answers hidden)")
    public ExerciseDetailPracticeResponse getExerciseForPractice(@PathVariable UUID id) {
        return exerciseService.getExerciseForPractice(id);
    }

    @PostMapping
    @Operation(summary = "Create a new exercise (Teachers and Admins)")
    public ResponseEntity<ExerciseResponse> createExercise(@Valid @RequestBody ExerciseRequest request) {
        ExerciseResponse response = exerciseService.createExercise(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit answers for an exercise to auto-grade and calculate IELTS band score")
    public ResponseEntity<SubmissionResultResponse> submitExercise(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody ListeningSubmissionRequest request) {
        SubmissionResultResponse result = submissionService.submitListeningExercise(id, principal.getUsername(), request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/submissions")
    @Operation(summary = "Get current user submission history for an exercise")
    public List<SubmissionResponse> getSubmissionHistory(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return submissionService.getSubmissionHistory(id, principal.getUsername());
    }
}
