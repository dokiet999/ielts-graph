package com.ielts.backend.exception;

public class AsrTimeoutException extends RuntimeException {

    public AsrTimeoutException(String message) {
        super(message);
    }

    public AsrTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}
