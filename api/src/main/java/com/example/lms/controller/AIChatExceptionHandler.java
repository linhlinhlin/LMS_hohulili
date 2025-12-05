package com.example.lms.controller;

import com.example.lms.dto.ai.AIChatErrorResponse;
import com.example.lms.service.ai.SessionNotFoundException;
import com.example.lms.service.ai.exception.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Exception handler cho AI Chat endpoints.
 * Xử lý và transform exceptions thành HTTP responses phù hợp.
 */
@RestControllerAdvice(assignableTypes = AIChatController.class)
public class AIChatExceptionHandler {
    
    private static final Logger log = LoggerFactory.getLogger(AIChatExceptionHandler.class);
    
    /**
     * AI Service không khả dụng (connection error)
     * → 502 Bad Gateway
     */
    @ExceptionHandler(AIServiceUnavailableException.class)
    public ResponseEntity<AIChatErrorResponse> handleUnavailable(AIServiceUnavailableException ex) {
        log.error("AI Service unavailable: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
            .body(AIChatErrorResponse.of("ai_unavailable", "AI Service không khả dụng"));
    }
    
    /**
     * AI Service timeout (cold start)
     * → 504 Gateway Timeout
     */
    @ExceptionHandler(AIServiceTimeoutException.class)
    public ResponseEntity<AIChatErrorResponse> handleTimeout(AIServiceTimeoutException ex) {
        log.error("AI Service timeout: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT)
            .body(AIChatErrorResponse.of("ai_timeout", "AI Service đang khởi động, vui lòng thử lại"));
    }
    
    /**
     * AI Service rate limit
     * → 429 Too Many Requests
     */
    @ExceptionHandler(AIServiceRateLimitException.class)
    public ResponseEntity<AIChatErrorResponse> handleRateLimit(AIServiceRateLimitException ex) {
        log.warn("AI Service rate limit: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .body(AIChatErrorResponse.withRetry("rate_limited", "Gửi quá nhanh, vui lòng chờ", ex.getRetryAfter()));
    }
    
    /**
     * Session không tồn tại
     * → 404 Not Found
     */
    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<AIChatErrorResponse> handleSessionNotFound(SessionNotFoundException ex) {
        log.warn("Session not found: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(AIChatErrorResponse.of("session_not_found", ex.getMessage()));
    }
    
    /**
     * Access denied (không có quyền truy cập session)
     * → 403 Forbidden
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<AIChatErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(AIChatErrorResponse.of("access_denied", "Không có quyền truy cập"));
    }
    
    /**
     * Validation error (message empty, etc.)
     * → 400 Bad Request
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<AIChatErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(AIChatErrorResponse.of("validation_error", ex.getMessage()));
    }
    
    /**
     * Request body validation error
     * → 400 Bad Request
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<AIChatErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .findFirst()
            .orElse("Dữ liệu không hợp lệ");
        
        log.warn("Request validation error: {}", message);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(AIChatErrorResponse.of("validation_error", message));
    }
    
    /**
     * Generic AI Service error
     * → Dynamic status code
     */
    @ExceptionHandler(AIServiceException.class)
    public ResponseEntity<AIChatErrorResponse> handleAIServiceError(AIServiceException ex) {
        log.error("AI Service error: {} (status: {})", ex.getMessage(), ex.getStatusCode());
        return ResponseEntity.status(ex.getStatusCode())
            .body(AIChatErrorResponse.of("ai_error", ex.getMessage()));
    }
    
    /**
     * Unexpected error
     * → 500 Internal Server Error
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<AIChatErrorResponse> handleGeneric(Exception ex) {
        log.error("Unexpected error in AI Chat", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(AIChatErrorResponse.of("internal_error", "Lỗi hệ thống, vui lòng thử lại"));
    }
}
