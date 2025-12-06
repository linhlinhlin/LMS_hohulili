package com.example.lms.dto.ai;

/**
 * Response DTO cho chat endpoint trả về Frontend.
 * Format theo API contract với Frontend team.
 */
public record ChatResponseDTO(
    String status,
    ChatDataDTO data
) {
    public static ChatResponseDTO success(ChatDataDTO data) {
        return new ChatResponseDTO("success", data);
    }
}
