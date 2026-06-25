package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.time.Instant;
import java.util.UUID;

public record AcademicSubject(
        UUID id,
        UUID organizationId,
        UUID departmentId,
        String code,
        String name,
        Integer credits,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicSubject create(UUID organizationId, UUID departmentId, String code, String name, Integer credits) {
        int safeCredits = credits == null ? 0 : credits;
        if (safeCredits < 0) {
            throw new ValidationException("credits", "credits must be non-negative");
        }
        return new AcademicSubject(
                UUID.randomUUID(),
                organizationId,
                departmentId,
                AcademicStrings.code(code),
                AcademicStrings.required("name", name),
                safeCredits,
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}
