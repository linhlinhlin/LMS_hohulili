package com.example.lms.dto.ai;

import com.example.lms.entity.ChatSession;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO cho session detail với tất cả messages.
 * Dùng cho GET /sessions/{id} endpoint.
 */
public record ChatSessionDetailDTO(
    UUID id,
    String title,
    Instant createdAt,
    Instant updatedAt,
    List<ChatMessageDTO> messages
) {
    /**
     * Convert từ entity sang DTO
     */
    public static ChatSessionDetailDTO fromEntity(ChatSession session) {
        List<ChatMessageDTO> messageDTOs = session.getMessages() != null
            ? session.getMessages().stream()
                .map(ChatMessageDTO::fromEntity)
                .toList()
            : List.of();
            
        return new ChatSessionDetailDTO(
            session.getId(),
            session.getTitle(),
            session.getCreatedAt(),
            session.getUpdatedAt(),
            messageDTOs
        );
    }
}
