package com.example.lms.shared.domain.valueobject;

import java.util.Objects;
import java.util.UUID;

/**
 * Value Object representing a Teacher identifier.
 * Wraps UserId to provide semantic meaning in course authoring context.
 */
public record TeacherId(UUID value) {
    
    public TeacherId {
        Objects.requireNonNull(value, "TeacherId value cannot be null");
    }
    
    public static TeacherId of(UUID value) {
        return new TeacherId(value);
    }
    
    public static TeacherId fromUserId(UserId userId) {
        return new TeacherId(userId.value());
    }
    
    public UserId toUserId() {
        return UserId.of(value);
    }
    
    @Override
    public String toString() {
        return value.toString();
    }
}
