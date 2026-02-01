package com.example.lms.ai_assistant.application.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for chat message.
 */
public record ChatMessageResponse(
    UUID id,
    UUID sessionId,
    String role,       // "user" or "assistant"
    String content,
    Instant createdAt
) {}
