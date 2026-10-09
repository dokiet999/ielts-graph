package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

/** Learner view of an option: no isCorrect, point or explanation. */
@Data
@Builder
public class ExerciseOptionResponse {
    private UUID id;
    private String optionText;
    private Integer ordering;
}
