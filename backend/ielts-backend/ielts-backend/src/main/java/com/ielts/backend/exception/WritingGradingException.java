package com.ielts.backend.exception;

import lombok.Getter;

@Getter
public class WritingGradingException extends RuntimeException {

    private final String code;

    public WritingGradingException(String code, String message) {
        super(message);
        this.code = code;
    }

    public WritingGradingException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }
}
