package com.example.lms.shared.domain.valueobject;

import java.util.Objects;
import java.util.UUID;

/**
 * Value Object representing a Course identifier.
 * Used across modules to reference courses without coupling to Course entity.
 */
public record CourseId(UUID value) {
    
    public CourseId {
        Objects.requireNonNull(value, "CourseId value cannot be null");
    }
    
    public static CourseId of(UUID value) {
        return new CourseId(value);
    }
    
    public static CourseId generate() {
        return new CourseId(UUID.randomUUID());
    }
    
    public static CourseId fromString(String value) {
        return new CourseId(UUID.fromString(value));
    }
    
    @Override
    public String toString() {
        return value.toString();
    }
}
