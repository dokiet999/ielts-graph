package com.ielts.backend.exception.customException;

import com.ielts.backend.exception.GlobalExceptionHandler;
import lombok.Getter;

/** Mapped to HTTP 409 by {@link GlobalExceptionHandler}. */
@Getter
public class ConflictException extends RuntimeException {

    private final String code;

    public ConflictException(String code, String message) {
        super(message);
        this.code = code;
    }
}
