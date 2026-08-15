package com.example.lms.academic.domain.model;

import java.time.Instant;
import java.util.UUID;

public record AcademicClassGroup(
        UUID id,
        UUID organizationId,
        UUID programId,
        UUID cohortId,
        String code,
        String name,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicClassGroup create(
            UUID organizationId,
            UUID programId,
            UUID cohortId,
            String code,
            String name
    ) {
        return new AcademicClassGroup(
                UUID.randomUUID(),
                organizationId,
                programId,
                cohortId,
                AcademicStrings.code(code),
                AcademicStrings.required("name", name),
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}
