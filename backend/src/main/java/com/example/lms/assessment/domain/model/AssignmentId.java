package com.example.lms.assessment.domain.model;

import java.util.UUID;

/**
 * Value Object representing Assignment ID.
 */
public record AssignmentId(UUID value) {
    
    public AssignmentId {
        if (value == null) {
            throw new IllegalArgumentException("ID bài tập không được null");
        }
    }

    public static AssignmentId of(UUID value) {
        return new AssignmentId(value);
    }

    public static AssignmentId generate() {
        return new AssignmentId(UUID.randomUUID());
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
