package com.example.lms.service.ai.exception;

/**
 * Exception khi AI Service rate limit.
 * Maps to HTTP 429 Too Many Requests.
 */
public class AIServiceRateLimitException extends AIServiceException {
    
    private final int retryAfter;
    
    public AIServiceRateLimitException(String message, int retryAfter) {
        super(message, 429);
        this.retryAfter = retryAfter;
    }
    
    public int getRetryAfter() {
        return retryAfter;
    }
}
