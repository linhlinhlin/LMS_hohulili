package com.example.lms.ai_assistant.domain.model;

import java.util.UUID;

/**
 * Value Object representing Chat Session ID.
 */
public record ChatSessionId(UUID value) {
    
    public ChatSessionId {
        if (value == null) {
            throw new IllegalArgumentException("ChatSession ID cannot be null");
        }
    }

    public static ChatSessionId of(UUID value) {
        return new ChatSessionId(value);
    }

    public static ChatSessionId generate() {
        return new ChatSessionId(UUID.randomUUID());
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
