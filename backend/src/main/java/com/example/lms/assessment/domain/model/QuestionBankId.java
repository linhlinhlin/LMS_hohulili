package com.example.lms.assessment.domain.model;

import java.util.UUID;

/**
 * Value object for QuestionBank identity.
 * Wraps UUID for type safety in domain layer.
 */
public record QuestionBankId(UUID value) {

    public QuestionBankId {
        if (value == null) {
            throw new IllegalArgumentException("ID ngân hàng câu hỏi không được null");
        }
    }

    public static QuestionBankId of(UUID value) {
        return new QuestionBankId(value);
    }

    public static QuestionBankId generate() {
        return new QuestionBankId(UUID.randomUUID());
    }

    @Override
    public String toString() {
        return value.toString();
    }
}
