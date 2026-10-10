package com.ielts.backend.exception;

import lombok.Getter;

/** Mapped to HTTP 400 by {@link GlobalExceptionHandler}, with a machine-readable code and optional details. */
@Getter
public class BadRequestException extends RuntimeException {

    private final String code;
    private final transient Object details;

    public BadRequestException(String code, String message) {
        this(code, message, null);
    }

    public BadRequestException(String code, String message, Object details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}
