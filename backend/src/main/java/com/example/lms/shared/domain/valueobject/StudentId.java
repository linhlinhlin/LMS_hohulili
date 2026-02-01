package com.example.lms.shared.domain.valueobject;

import java.util.Objects;
import java.util.UUID;

/**
 * Value Object representing a Student identifier.
 * Wraps UserId to provide semantic meaning in enrollment context.
 */
public record StudentId(UUID value) {
    
    public StudentId {
        Objects.requireNonNull(value, "StudentId value cannot be null");
    }
    
    public static StudentId of(UUID value) {
        return new StudentId(value);
    }
    
    public static StudentId fromUserId(UserId userId) {
        return new StudentId(userId.value());
    }
    
    public UserId toUserId() {
        return UserId.of(value);
    }
    
    @Override
    public String toString() {
        return value.toString();
    }
}
