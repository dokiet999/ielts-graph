package com.ielts.backend.controller;

import com.ielts.backend.dto.response.LessonDetailResponse;
import com.ielts.backend.service.LessonService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/lessons")
@RequiredArgsConstructor
@Tag(name = "Lessons", description = "Lesson detail and its exercises")
public class LessonController {

    private final LessonService lessonService;

    @GetMapping("/{id}")
    @Operation(summary = "Lesson detail with parent course/section and exercises")
    public LessonDetailResponse getLessonDetail(@PathVariable UUID id) {
        return lessonService.getLessonDetail(id);
    }
}
