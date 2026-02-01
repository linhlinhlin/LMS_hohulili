package com.example.lms.shared.domain.valueobject;

import java.util.Objects;
import java.util.UUID;

/**
 * Value Object representing a User identifier.
 * Used across modules to reference users without coupling to User entity.
 */
public record UserId(UUID value) {
    
    public UserId {
        Objects.requireNonNull(value, "UserId value cannot be null");
    }
    
    public static UserId of(UUID value) {
        return new UserId(value);
    }
    
    public static UserId generate() {
        return new UserId(UUID.randomUUID());
    }
    
    public static UserId fromString(String value) {
        return new UserId(UUID.fromString(value));
    }
    
    @Override
    public String toString() {
        return value.toString();
    }
}
