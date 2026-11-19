package com.ielts.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalTestSessionDto {
    private UUID sessionId;
    private UUID exerciseId;
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;
    private long remainingSeconds;
}

