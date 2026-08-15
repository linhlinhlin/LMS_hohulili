package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.time.Instant;
import java.util.UUID;

public record AcademicCurriculumPlan(
        UUID id,
        UUID organizationId,
        UUID programId,
        UUID cohortId,
        String code,
        String name,
        Integer totalCredits,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicCurriculumPlan create(
            UUID organizationId,
            UUID programId,
            UUID cohortId,
            String code,
            String name,
            Integer totalCredits) {
        int safeTotalCredits = totalCredits == null ? 0 : totalCredits;
        if (programId == null) {
            throw new ValidationException("programId", "programId is required");
        }
        if (safeTotalCredits < 0) {
            throw new ValidationException("totalCredits", "totalCredits must be non-negative");
        }
        return new AcademicCurriculumPlan(
                UUID.randomUUID(),
                organizationId,
                programId,
                cohortId,
                AcademicStrings.code(code),
                AcademicStrings.required("name", name),
                safeTotalCredits,
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}
