package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class QuestionAnswerRequest {

    @NotNull
    private UUID submissionId;

    @NotNull
    private UUID questionId;

    private String answerText;

    private List<UUID> selectedOptions;

    private String mediaUrl;
}
