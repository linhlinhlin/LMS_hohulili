package com.example.lms.dto.ai.external;

/**
 * Response DTO từ AI Service (Maritime AI Chatbot).
 * Format theo API documentation của AI Backend team.
 */
public record AIServiceResponse(
    String status,
    AIDataResponse data,
    AIMetadataResponse metadata
) {
    public boolean isSuccess() {
        return "success".equals(status);
    }
}
