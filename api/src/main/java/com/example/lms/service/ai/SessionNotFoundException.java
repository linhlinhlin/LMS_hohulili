package com.example.lms.service.ai;

/**
 * Exception khi session không tồn tại hoặc không thuộc về user.
 */
public class SessionNotFoundException extends RuntimeException {
    
    public SessionNotFoundException(String message) {
        super(message);
    }
}
