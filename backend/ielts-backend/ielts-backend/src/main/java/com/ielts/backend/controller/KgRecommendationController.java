package com.ielts.backend.controller;

import com.ielts.backend.dto.response.KgRecommendationResponse;
import com.ielts.backend.service.KgRecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/kg")
@RequiredArgsConstructor
@Tag(name = "Knowledge Graph", description = "Practice resource recommendations from the IELTS Knowledge Graph")
public class KgRecommendationController {

    private final KgRecommendationService kgRecommendationService;

    @GetMapping("/recommendations")
    @Operation(summary = "Recommend practice resources for error codes detected by the AI grader")
    public KgRecommendationResponse getRecommendations(
            @RequestParam(value = "skill", required = false) String skill,
            @RequestParam(value = "errors", required = false) String errors,
            @RequestParam(value = "band", required = false) String band,
            @RequestParam(value = "limitPerError", required = false) String limitPerError
    ) {
        return kgRecommendationService.getRecommendations(skill, errors, band, limitPerError);
    }
}

