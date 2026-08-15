package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

final class AcademicStrings {
    private AcademicStrings() {}

    static String required(String field, String value) {
        if (value == null || value.isBlank()) {
            throw new ValidationException(field, field + " is required");
        }
        return value.trim();
    }

    static String code(String value) {
        return required("code", value).toUpperCase();
    }

    static String status(String value) {
        return value == null || value.isBlank() ? "ACTIVE" : value.trim().toUpperCase();
    }
}
