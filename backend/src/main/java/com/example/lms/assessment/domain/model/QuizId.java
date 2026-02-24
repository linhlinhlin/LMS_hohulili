package com.example.lms.assessment.domain.model;

import java.util.UUID;

/**
 * Value Object representing Quiz ID.
 * Immutable and validates the ID format.
 */
public record QuizId(UUID value) {
    
    public QuizId {
        if (value == null) {
            throw new IllegalArgumentException("ID bài kiểm tra không được null");
        }
    }

    public static QuizId of(UUID value) {
        return new QuizId(value);
    }

    public static QuizId generate() {
        return new QuizId(UUID.randomUUID());
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
