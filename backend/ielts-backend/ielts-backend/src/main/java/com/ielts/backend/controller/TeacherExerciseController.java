package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.dto.request.ReplaceExerciseQuestionsRequest;
import com.ielts.backend.dto.request.TeacherExerciseRequest;
import com.ielts.backend.dto.response.TeacherExerciseDetailResponse;
import com.ielts.backend.dto.response.TeacherLessonExercisesResponse;
import com.ielts.backend.service.TeacherExerciseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
@Tag(name = "Teacher - Exercises", description = "Teacher authoring for lesson exercises and question builders")
public class TeacherExerciseController {

    private final TeacherExerciseService teacherExerciseService;

    @GetMapping("/lessons/{lessonId}/exercises")
    @Operation(summary = "List exercises inside an owned lesson with question and submission counts")
    public BaseResponse<TeacherLessonExercisesResponse> getLessonExercises(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(teacherExerciseService.getLessonExercises(lessonId, principal.getUsername()));
    }

    @PostMapping("/lessons/{lessonId}/exercises")
    @Operation(summary = "Create an exercise attached to an owned lesson")
    public ResponseEntity<BaseResponse<TeacherExerciseDetailResponse>> createExercise(
            @PathVariable UUID lessonId,
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody TeacherExerciseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.ofCreated(
                        teacherExerciseService.createExercise(lessonId, principal.getUsername(), request)));
    }

    @GetMapping("/exercises/{id}")
    @Operation(summary = "Get full exercise detail for authoring including answer keys and explanations")
    public BaseResponse<TeacherExerciseDetailResponse> getExerciseDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(teacherExerciseService.getExerciseDetail(id, principal.getUsername()));
    }

    @PutMapping("/exercises/{id}")
    @Operation(summary = "Update exercise metadata and content")
    public BaseResponse<TeacherExerciseDetailResponse> updateExercise(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody TeacherExerciseRequest request) {
        return BaseResponse.ofSuccess(
                teacherExerciseService.updateExercise(id, principal.getUsername(), request));
    }

    @DeleteMapping("/exercises/{id}")
    @Operation(summary = "Delete an exercise that has no learner submissions")
    public BaseResponse<Void> deleteExercise(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        teacherExerciseService.deleteExercise(id, principal.getUsername());
        return BaseResponse.ofDeleteSuccess();
    }

    @PutMapping("/exercises/{id}/questions")
    @Operation(summary = "Atomically replace question groups, questions, options and answer keys for an exercise")
    public BaseResponse<TeacherExerciseDetailResponse> replaceQuestions(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody ReplaceExerciseQuestionsRequest request) {
        return BaseResponse.ofSuccess(
                teacherExerciseService.replaceQuestions(id, principal.getUsername(), request));
    }
}
