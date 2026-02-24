package com.example.lms.communication.domain.model;

import java.util.UUID;

/**
 * Value Object representing Conversation ID.
 */
public record ConversationId(UUID value) {
    
    public ConversationId {
        if (value == null) {
            throw new IllegalArgumentException("ID cuộc hội thoại không được null");
        }
    }

    public static ConversationId of(UUID value) {
        return new ConversationId(value);
    }

    public static ConversationId generate() {
        return new ConversationId(UUID.randomUUID());
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
