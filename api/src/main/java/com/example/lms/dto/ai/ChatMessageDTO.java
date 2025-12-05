package com.example.lms.dto.ai;

import com.example.lms.entity.ChatMessage;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTO cho chat message.
 * Dùng trong session detail response.
 */
public record ChatMessageDTO(
    UUID id,
    String content,
    String senderType,
    Instant createdAt,
    List<SourceDTO> sources
) {
    private static final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Convert từ entity sang DTO
     */
    public static ChatMessageDTO fromEntity(ChatMessage message) {
        List<SourceDTO> sources = parseSources(message.getSources());
        
        return new ChatMessageDTO(
            message.getId(),
            message.getContent(),
            message.getSenderType().name(),
            message.getCreatedAt(),
            sources
        );
    }
    
    /**
     * Parse JSON sources string to list of SourceDTO
     */
    private static List<SourceDTO> parseSources(String sourcesJson) {
        if (sourcesJson == null || sourcesJson.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(sourcesJson, new TypeReference<List<SourceDTO>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
