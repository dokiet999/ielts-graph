package com.ielts.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ErrorResponse {
    private String code;
    private String message;
    private Object details;
    private LocalDateTime timestamp;
}
