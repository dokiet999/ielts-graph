package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;
import java.util.UUID;

@Data
public class SubmissionRequest {

    @NotNull
    private UUID exerciseId;

    /** Raw answers snapshot: questionId -> answer value */
    private Map<String, Object> answers;
}
