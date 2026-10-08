package com.ielts.backend.service;

import com.ielts.backend.dto.response.LessonDetailResponse;

import java.util.UUID;

public interface LessonService {

    /**
     * @param username the logged-in user, or null for anonymous access
     */
    LessonDetailResponse getLessonDetail(UUID lessonId, String username);
}
