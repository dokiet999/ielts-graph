package com.ielts.backend.exception.customException;

import com.ielts.backend.exception.GlobalExceptionHandler;

/** Mapped to HTTP 403 by {@link GlobalExceptionHandler}. */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
