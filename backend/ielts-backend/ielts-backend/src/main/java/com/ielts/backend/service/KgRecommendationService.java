package com.ielts.backend.service;

import com.ielts.backend.dto.response.KgRecommendationResponse;

public interface KgRecommendationService {

    KgRecommendationResponse getRecommendations(String skill, String errors, String band, String limitPerError);
}

