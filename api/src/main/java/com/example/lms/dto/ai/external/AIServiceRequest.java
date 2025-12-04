package com.example.lms.dto.ai.external;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request DTO gửi đến AI Service (Maritime AI Chatbot).
 * Format theo API documentation của AI Backend team.
 */
public record AIServiceRequest(
    @JsonProperty("user_id")
    String userId,
    
    String message,
    
    String role,
    
    @JsonProperty("session_id")
    String sessionId,
    
    AIContextRequest context
) {
    /**
     * Builder pattern cho dễ tạo request
     */
    public static AIServiceRequest create(String userId, String message, String role) {
        return new AIServiceRequest(userId, message, role, null, null);
    }
    
    public static AIServiceRequest create(String userId, String message, String role, 
                                          String sessionId, AIContextRequest context) {
        return new AIServiceRequest(userId, message, role, sessionId, context);
    }
}
