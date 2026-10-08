package com.ielts.backend.exception;

/** Mapped to HTTP 403 by {@link GlobalExceptionHandler}. */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
