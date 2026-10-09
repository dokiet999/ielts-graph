package com.ielts.backend.controller;

import com.ielts.backend.dto.request.ReadingSubmissionRequest;
import com.ielts.backend.dto.response.ReadingSubmissionResultResponse;
import com.ielts.backend.service.ReadingSubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Separate path for now so this branch does not touch the Listening controller.
 * To be merged with POST /api/exercises/{id}/submit when #3-#6 are combined.
 * Not under a permitAll rule, so it requires login.
 */
@RestController
@RequestMapping("/api/reading/exercises")
@RequiredArgsConstructor
@Tag(name = "Reading", description = "Submit and auto-grade Reading exercises")
public class ReadingSubmissionController {

    private final ReadingSubmissionService readingSubmissionService;

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit a Reading exercise (students only). Returns score, statistics by question type and incorrect questions")
    public ReadingSubmissionResultResponse submit(@PathVariable UUID id,
                                                  @AuthenticationPrincipal UserDetails principal,
                                                  @Valid @RequestBody ReadingSubmissionRequest request) {
        return readingSubmissionService.submit(id, principal.getUsername(), request);
    }
}
