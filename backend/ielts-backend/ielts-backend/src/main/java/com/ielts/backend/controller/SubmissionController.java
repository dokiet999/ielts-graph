package com.ielts.backend.controller;

import com.ielts.backend.dto.response.SubmissionResponse;
import com.ielts.backend.dto.response.SubmissionReviewResponse;
import com.ielts.backend.service.SubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
@Tag(name = "Submissions", description = "View submission results and detailed reviews with transcript")
public class SubmissionController {

    private final SubmissionService submissionService;

    @GetMapping("/{id}")
    @Operation(summary = "Get submission details by ID")
    public SubmissionResponse getSubmissionDetail(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return submissionService.getSubmissionDetail(id, principal.getUsername());
    }

    @GetMapping("/{id}/review")
    @Operation(summary = "Review submission with audio, transcript, and detailed question explanations")
    public SubmissionReviewResponse getSubmissionReview(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        return submissionService.getSubmissionReview(id, principal.getUsername());
    }
}
