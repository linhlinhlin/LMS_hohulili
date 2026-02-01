package com.example.lms.ai_assistant.application.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for chat session.
 */
public record ChatSessionResponse(
    UUID id,
    UUID userId,
    String title,
    String contextType,
    UUID contextId,
    boolean isArchived,
    Instant createdAt,
    Instant updatedAt
) {}
