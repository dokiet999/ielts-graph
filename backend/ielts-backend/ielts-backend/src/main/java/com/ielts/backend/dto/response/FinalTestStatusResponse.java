package com.ielts.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalTestStatusResponse {
    private ExerciseSummaryResponse exercise;
    private boolean unlocked;
    private boolean grantExpired;
    private Integer deadlineDays;
    private LocalDateTime unlockedAt;
    private LocalDateTime grantExpiresAt;
    private FinalTestSessionDto activeSession;
}

