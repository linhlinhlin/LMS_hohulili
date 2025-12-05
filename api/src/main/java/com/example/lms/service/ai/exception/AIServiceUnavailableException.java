package com.example.lms.service.ai.exception;

/**
 * Exception khi AI Service không khả dụng (connection error).
 * Maps to HTTP 502 Bad Gateway.
 */
public class AIServiceUnavailableException extends AIServiceException {
    
    public AIServiceUnavailableException(String message) {
        super(message, 502);
    }
    
    public AIServiceUnavailableException(String message, Throwable cause) {
        super(message, 502, cause);
    }
}
