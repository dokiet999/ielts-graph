package com.ielts.backend.controller;

import com.ielts.backend.dto.request.ObjectiveSubmissionRequest;
import com.ielts.backend.dto.response.ObjectiveSubmissionResultResponse;
import com.ielts.backend.dto.response.SubmissionResponse;
import com.ielts.backend.service.ObjectiveSubmissionService;
import com.ielts.backend.service.SubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Submitting an exercise and its attempt history. Kept apart from ExerciseController
 * (browsing), so the two can change independently. Each (method, path) below must be
 * declared only here: a second mapping of the same path makes Spring fail at startup
 * with "Ambiguous mapping".
 */
@RestController
@RequestMapping("/api/exercises")
@RequiredArgsConstructor
@Tag(name = "Exercise submissions", description = "Submit Reading/Listening exercises and view attempts")
public class ExerciseSubmissionController {

    private final ObjectiveSubmissionService objectiveSubmissionService;
    private final SubmissionService submissionService;

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit a Reading or Listening exercise (students only). Returns score, statistics by question type and incorrect questions")
    public ObjectiveSubmissionResultResponse submit(@PathVariable UUID id,
                                                    @AuthenticationPrincipal UserDetails principal,
                                                    @Valid @RequestBody ObjectiveSubmissionRequest request) {
        return objectiveSubmissionService.submit(id, principal.getUsername(), request);
    }

    @GetMapping("/{id}/submissions")
    @Operation(summary = "Current user's attempts for an exercise")
    public List<SubmissionResponse> history(@PathVariable UUID id,
                                            @AuthenticationPrincipal UserDetails principal) {
        return submissionService.getSubmissionHistory(id, principal.getUsername());
    }
}
