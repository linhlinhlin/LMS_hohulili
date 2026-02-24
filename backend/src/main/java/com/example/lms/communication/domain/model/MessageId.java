package com.example.lms.communication.domain.model;

import java.util.UUID;

/**
 * Value Object representing Message ID.
 */
public record MessageId(UUID value) {
    
    public MessageId {
        if (value == null) {
            throw new IllegalArgumentException("ID tin nhắn không được null");
        }
    }

    public static MessageId of(UUID value) {
        return new MessageId(value);
    }

    public static MessageId generate() {
        return new MessageId(UUID.randomUUID());
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
