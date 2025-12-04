package com.example.lms.service.ai.exception;

/**
 * Exception khi AI Service timeout (cold start).
 * Maps to HTTP 504 Gateway Timeout.
 */
public class AIServiceTimeoutException extends AIServiceException {
    
    public AIServiceTimeoutException(String message) {
        super(message, 504);
    }
    
    public AIServiceTimeoutException(String message, Throwable cause) {
        super(message, 504, cause);
    }
}
