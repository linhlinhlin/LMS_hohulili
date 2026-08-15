package com.example.lms.academic.domain.model;

import java.time.Instant;
import java.util.UUID;

public record AcademicProgram(
        UUID id,
        UUID organizationId,
        UUID departmentId,
        String code,
        String name,
        String level,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicProgram create(UUID organizationId, UUID departmentId, String code, String name, String level) {
        return new AcademicProgram(
                UUID.randomUUID(),
                organizationId,
                departmentId,
                AcademicStrings.code(code),
                AcademicStrings.required("name", name),
                level == null || level.isBlank() ? null : level.trim(),
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}
