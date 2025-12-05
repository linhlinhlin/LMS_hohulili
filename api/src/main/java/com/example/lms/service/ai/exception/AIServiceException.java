package com.example.lms.service.ai.exception;

/**
 * Base exception cho AI Service errors.
 */
public class AIServiceException extends RuntimeException {
    
    private final int statusCode;
    
    public AIServiceException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
    
    public AIServiceException(String message, int statusCode, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
    }
    
    public int getStatusCode() {
        return statusCode;
    }
}
