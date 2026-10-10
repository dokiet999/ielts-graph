package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class SubmissionReviewResponse {
    private SubmissionResultResponse submission;
    private String audioUrl;
    private Map<String, Object> content;
}
