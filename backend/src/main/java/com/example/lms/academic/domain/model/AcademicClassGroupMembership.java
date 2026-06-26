package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record AcademicClassGroupMembership(
        UUID id,
        UUID organizationId,
        UUID classGroupId,
        UUID studentId,
        String status,
        Instant joinedAt,
        Instant leftAt,
        Instant createdAt,
        Instant updatedAt
) {
    public AcademicClassGroupMembership {
        Objects.requireNonNull(id, "id is required");
        Objects.requireNonNull(organizationId, "organizationId is required");
        Objects.requireNonNull(classGroupId, "classGroupId is required");
        Objects.requireNonNull(studentId, "studentId is required");
        status = AcademicStrings.status(status);
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new ValidationException("status", "Unsupported class group membership status");
        }
        if (joinedAt == null) {
            joinedAt = Instant.now();
        }
        if (createdAt == null) {
            createdAt = joinedAt;
        }
    }

    public static AcademicClassGroupMembership assign(UUID organizationId, UUID classGroupId, UUID studentId) {
        var now = Instant.now();
        return new AcademicClassGroupMembership(
                UUID.randomUUID(),
                organizationId,
                classGroupId,
                studentId,
                "ACTIVE",
                now,
                null,
                now,
                null);
    }
}
