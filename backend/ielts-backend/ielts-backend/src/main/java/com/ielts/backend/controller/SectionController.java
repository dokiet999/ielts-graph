package com.ielts.backend.controller;

import com.ielts.backend.dto.response.ExerciseSummaryResponse;
import com.ielts.backend.service.LessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
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
}
