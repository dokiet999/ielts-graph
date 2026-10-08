package com.ielts.backend.service;

import com.ielts.backend.dto.response.LessonDetailResponse;

import java.util.UUID;

public interface LessonService {

    LessonDetailResponse getLessonDetail(UUID lessonId);
}
