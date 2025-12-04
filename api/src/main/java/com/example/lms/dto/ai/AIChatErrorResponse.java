package com.example.lms.dto.ai;

/**
 * DTO cho error response từ AI Chat endpoints.
 * Format thống nhất cho tất cả lỗi.
 */
public record AIChatErrorResponse(
    String error,
    String message,
    Integer retryAfter
) {
    public static AIChatErrorResponse of(String error, String message) {
        return new AIChatErrorResponse(error, message, null);
    }
    
    public static AIChatErrorResponse withRetry(String error, String message, int retryAfter) {
        return new AIChatErrorResponse(error, message, retryAfter);
    }
}
