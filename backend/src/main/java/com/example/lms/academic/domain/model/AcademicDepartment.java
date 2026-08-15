package com.example.lms.academic.domain.model;

import java.time.Instant;
import java.util.UUID;

public record AcademicDepartment(
        UUID id,
        UUID organizationId,
        String code,
        String name,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicDepartment create(UUID organizationId, String code, String name) {
        return new AcademicDepartment(
                UUID.randomUUID(),
                organizationId,
                AcademicStrings.code(code),
                AcademicStrings.required("name", name),
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}
