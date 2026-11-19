package com.ielts.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

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

    @Size(max = 512)
    private String mediaUrl;
}
