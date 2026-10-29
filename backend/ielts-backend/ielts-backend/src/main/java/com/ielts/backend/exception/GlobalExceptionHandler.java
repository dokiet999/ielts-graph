package com.ielts.backend.exception;

import com.ielts.backend.dto.response.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.LocalDateTime;

/**
 * Every error response uses the {@link ErrorResponse} format.
 * Spring MVC exceptions (404 unknown path, 405, 415...) keep their own status
 * through {@link ResponseEntityExceptionHandler}; security errors from the
 * filter chain are forwarded here by SecurityConfig.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), null);
    }

    /** FR-1.02: teacher account not yet approved by an admin. */
    @ExceptionHandler(DisabledException.class)
    public ResponseEntity<ErrorResponse> handlePending(DisabledException ex) {
        return build(HttpStatus.UNAUTHORIZED, "ACCOUNT_PENDING", "Account is waiting for admin approval", null);
    }

    /** FR-7.01: account locked by an admin. */
    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ErrorResponse> handleLocked(LockedException ex) {
        return build(HttpStatus.UNAUTHORIZED, "ACCOUNT_LOCKED", "Account is locked", null);
    }

    @ExceptionHandler({UnauthorizedException.class, AuthenticationException.class})
    public ResponseEntity<ErrorResponse> handleUnauthorized(RuntimeException ex) {
        return build(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", ex.getMessage(), null);
    }

    @ExceptionHandler({ForbiddenException.class, AccessDeniedException.class})
    public ResponseEntity<ErrorResponse> handleForbidden(RuntimeException ex) {
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), null);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
        return build(HttpStatus.BAD_REQUEST, ex.getCode(), ex.getMessage(), ex.getDetails());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException ex) {
        return build(HttpStatus.CONFLICT, ex.getCode(), ex.getMessage(), null);
    }

    /** LLM returned unparseable or schema-invalid JSON, even after retry. */
    @ExceptionHandler(WritingGradingException.class)
    public ResponseEntity<ErrorResponse> handleWritingGrading(WritingGradingException ex) {
        // Details (LLM output fragments, schema errors) stay in the log, not in the response
        log.warn("Writing grading failed: {} — {}", ex.getCode(), ex.getMessage());
        return build(HttpStatus.BAD_GATEWAY, ex.getCode(),
                "The AI could not produce a valid grading result. Please try again", null);
    }

    /** The speech recognition service (Whisper) timed out, was unreachable or answered badly. */
    @ExceptionHandler(SpeakingAsrException.class)
    public ResponseEntity<ErrorResponse> handleSpeakingAsr(SpeakingAsrException ex) {
        // Only the code is logged: nothing from the audio or the transcript
        log.warn("Speaking ASR failed: {}", ex.getCode());
        HttpStatus status = "ASR_UNAVAILABLE".equals(ex.getCode()) ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY;
        return build(status, ex.getCode(), "The speech recognition service failed. Please try again", null);
    }

    /** LLM returned unparseable or schema-invalid Speaking feedback, even after retry. */
    @ExceptionHandler(SpeakingGradingException.class)
    public ResponseEntity<ErrorResponse> handleSpeakingGrading(SpeakingGradingException ex) {
        log.warn("Speaking grading failed: {}", ex.getCode());
        return build(HttpStatus.BAD_GATEWAY, ex.getCode(),
                "The AI could not produce a valid grading result. Please try again", null);
    }

    /** LLM API call exceeded configured timeout. */
    @ExceptionHandler(LlmTimeoutException.class)
    public ResponseEntity<ErrorResponse> handleLlmTimeout(LlmTimeoutException ex) {
        log.warn("LLM timeout: {}", ex.getMessage());
        return build(HttpStatus.BAD_GATEWAY, "LLM_TIMEOUT",
                "The AI service took too long to respond. Please try again", null);
    }

    /** Neo4j Knowledge Graph unreachable or query failed. */
    @ExceptionHandler(KgUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleKgUnavailable(KgUnavailableException ex) {
        Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
        log.warn("Knowledge graph unavailable: {}", cause.getClass().getSimpleName());
        return build(HttpStatus.SERVICE_UNAVAILABLE, "KG_UNAVAILABLE",
                "The knowledge graph is temporarily unavailable. Please try again later", null);
    }

    /** LLM API returned 401/403 or a server-side 5xx. */
    @ExceptionHandler(LlmUnavailableException.class)
    public ResponseEntity<ErrorResponse> handleLlmUnavailable(LlmUnavailableException ex) {
        log.warn("LLM unavailable: {}", ex.getMessage());
        return build(HttpStatus.SERVICE_UNAVAILABLE, "LLM_UNAVAILABLE",
                "The AI service is temporarily unavailable. Please try again later", null);
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        log.warn("Audio upload exceeded maximum size: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(error(
                "AUDIO_TOO_LARGE", "Audio file exceeds the maximum allowed size", null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Unexpected error", null);
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(TypeMismatchException ex, HttpHeaders headers,
                                                        HttpStatusCode status, WebRequest request) {
        String name = ex instanceof MethodArgumentTypeMismatchException m ? m.getName() : ex.getPropertyName();
        return ResponseEntity.badRequest().body(error(
                "INVALID_PARAMETER", "Invalid value for parameter '" + name + "'", ex.getValue()));
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, Object body, HttpHeaders headers,
                                                             HttpStatusCode statusCode, WebRequest request) {
        // Framework messages can expose internals (e.g. JSON parser details), so only the reason phrase is returned
        log.debug("Request failed with {}", statusCode, ex);
        HttpStatus status = HttpStatus.resolve(statusCode.value());
        String code = status != null ? status.name() : "ERROR";
        String message = status != null ? status.getReasonPhrase() : "Request failed";
        return ResponseEntity.status(statusCode).headers(headers).body(error(code, message, null));
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus status, String code, String message, Object details) {
        return ResponseEntity.status(status).body(error(code, message, details));
    }

    private ErrorResponse error(String code, String message, Object details) {
        return ErrorResponse.builder()
                .code(code)
                .message(message)
                .details(details)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
