package com.ielts.backend.controller;

import com.ielts.backend.dto.request.ObjectiveSubmissionRequest;
import com.ielts.backend.dto.request.WritingSubmissionRequest;
import com.ielts.backend.dto.response.ObjectiveSubmissionResultResponse;
import com.ielts.backend.dto.response.SpeakingSubmissionResultResponse;
import com.ielts.backend.dto.response.SubmissionResponse;
import com.ielts.backend.dto.response.WritingSubmissionResultResponse;
import com.ielts.backend.service.ObjectiveSubmissionService;
import com.ielts.backend.service.SpeakingSubmissionService;
import com.ielts.backend.service.SubmissionService;
import com.ielts.backend.service.WritingSubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

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
@Tag(name = "Exercise submissions", description = "Submit Reading/Listening/Writing/Speaking exercises and view attempts")
public class ExerciseSubmissionController {

    private final ObjectiveSubmissionService objectiveSubmissionService;
    private final WritingSubmissionService writingSubmissionService;
    private final SpeakingSubmissionService speakingSubmissionService;
    private final SubmissionService submissionService;

    @PostMapping("/{id}/submit")
    @Operation(summary = "Submit a Reading or Listening exercise (students only). Returns score, statistics by question type and incorrect questions")
    public ObjectiveSubmissionResultResponse submit(@PathVariable UUID id,
                                                     @AuthenticationPrincipal UserDetails principal,
                                                     @Valid @RequestBody ObjectiveSubmissionRequest request) {
        return objectiveSubmissionService.submit(id, principal.getUsername(), request);
    }

    @PostMapping("/{id}/submit/writing")
    @Operation(summary = "Submit a Writing essay (students only). Evaluates via AI and returns detailed band score and feedback")
    public WritingSubmissionResultResponse submitWriting(@PathVariable UUID id,
                                                         @AuthenticationPrincipal UserDetails principal,
                                                         @Valid @RequestBody WritingSubmissionRequest request) {
        return writingSubmissionService.submit(id, principal.getUsername(), request);
    }

    @PostMapping(value = "/{id}/submit/speaking", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit a Speaking audio recording (students only). Transcribes via ASR, evaluates via AI and returns detailed band score and feedback")
    public SpeakingSubmissionResultResponse submitSpeaking(@PathVariable UUID id,
                                                           @AuthenticationPrincipal UserDetails principal,
                                                           @RequestParam(value = "audio", required = false) MultipartFile audio,
                                                           @RequestParam(value = "timeSpent", required = false) Integer timeSpent) {
        return speakingSubmissionService.submit(id, principal.getUsername(), audio, timeSpent);
    }

    @GetMapping("/{id}/submissions")
    @Operation(summary = "Current user's attempts for an exercise")
    public List<SubmissionResponse> history(@PathVariable UUID id,
                                            @AuthenticationPrincipal UserDetails principal) {
        return submissionService.getSubmissionHistory(id, principal.getUsername());
    }
}
