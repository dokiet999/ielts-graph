package com.ielts.backend.controller;

import com.ielts.backend.dto.request.UnlockFinalTestRequest;
import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.dto.response.FinalTestSessionDto;
import com.ielts.backend.dto.response.FinalTestStatusResponse;
import com.ielts.backend.service.LessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sections")
@RequiredArgsConstructor
@Tag(name = "Sections", description = "Content of a course section")
public class SectionController {

    private final LessonService lessonService;

    @GetMapping("/{id}/exercises")
    @Operation(summary = "Exercises of every lesson in a section with the current user's attempts. Requires enrollment (FR-2.01)")
    public List<ExerciseSummaryResponse> getSectionExercises(@PathVariable UUID id,
                                                             @AuthenticationPrincipal UserDetails principal) {
        return lessonService.getSectionExercises(id, principal.getUsername());
    }

    @GetMapping("/{id}/mock-tests")
    @Operation(summary = "Mock test exercises of a section/skill with the current user's attempts. Requires enrollment")
    public List<ExerciseSummaryResponse> getSectionMockTests(@PathVariable UUID id,
                                                             @AuthenticationPrincipal UserDetails principal) {
        return lessonService.getSectionMockTests(id, principal.getUsername());
    }

    @GetMapping("/{id}/final-test")
    @Operation(summary = "Final test of a section/skill, admin unlock status, deadline, and real-time session")
    public FinalTestStatusResponse getSectionFinalTest(@PathVariable UUID id,
                                                       @AuthenticationPrincipal UserDetails principal) {
        return lessonService.getSectionFinalTest(id, principal.getUsername());
    }

    @PostMapping("/{id}/final-test/unlock")
    @Operation(summary = "Unlock the section's final test for a number of days (Admin / Demo)")
    public FinalTestStatusResponse unlockSectionFinalTest(@PathVariable UUID id,
                                                          @RequestBody(required = false) UnlockFinalTestRequest request,
                                                          @AuthenticationPrincipal UserDetails principal) {
        return lessonService.unlockSectionFinalTest(id, request, principal.getUsername());
    }

    @PostMapping("/{id}/final-test/lock")
    @Operation(summary = "Lock the section's final test (Admin / Demo)")
    public FinalTestStatusResponse lockSectionFinalTest(@PathVariable UUID id,
                                                        @RequestParam(required = false) String username,
                                                        @AuthenticationPrincipal UserDetails principal) {
        return lessonService.lockSectionFinalTest(id, username, principal.getUsername());
    }

    @PostMapping("/{id}/final-test/start")
    @Operation(summary = "Start or resume a wall-clock timed session for the section's final test")
    public FinalTestSessionDto startSectionFinalTest(@PathVariable UUID id,
                                                     @AuthenticationPrincipal UserDetails principal) {
        return lessonService.startSectionFinalTest(id, principal.getUsername());
    }
}
