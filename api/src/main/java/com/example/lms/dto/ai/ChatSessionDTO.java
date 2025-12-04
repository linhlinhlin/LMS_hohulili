package com.example.lms.dto.ai;

import com.example.lms.entity.ChatSession;
import java.time.Instant;
import java.util.UUID;

/**
 * DTO cho session summary trong danh sách sessions.
 * Dùng cho GET /sessions endpoint.
 */
public record ChatSessionDTO(
    UUID id,
    String title,
    Instant createdAt,
    Instant updatedAt,
    int messageCount
) {
    /**
     * Convert từ entity sang DTO
     */
    public static ChatSessionDTO fromEntity(ChatSession session) {
        return new ChatSessionDTO(
            session.getId(),
            session.getTitle(),
            session.getCreatedAt(),
            session.getUpdatedAt(),
            session.getMessages() != null ? session.getMessages().size() : 0
        );
    }
}
