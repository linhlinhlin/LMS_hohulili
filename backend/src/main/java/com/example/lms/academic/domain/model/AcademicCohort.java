package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.time.Instant;
import java.util.UUID;

public record AcademicCohort(
        UUID id,
        UUID organizationId,
        String code,
        String name,
        Integer startYear,
        Integer graduationYear,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicCohort create(
            UUID organizationId,
            String code,
            String name,
            Integer startYear,
            Integer graduationYear
    ) {
        if (startYear == null || startYear < 1900) {
            throw new ValidationException("startYear", "startYear is invalid");
        }
        if (graduationYear != null && graduationYear < startYear) {
            throw new ValidationException("graduationYear", "graduationYear must be after startYear");
        }
        return new AcademicCohort(
                UUID.randomUUID(),
                organizationId,
                AcademicStrings.code(code),
                AcademicStrings.required("name", name),
                startYear,
                graduationYear,
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}
