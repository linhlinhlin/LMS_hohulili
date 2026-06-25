package com.example.lms.academic.domain.model;

import java.time.Instant;
import java.util.UUID;

public record AcademicSubjectCourse(
        UUID id,
        UUID organizationId,
        UUID subjectId,
        UUID courseId,
        boolean primary,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicSubjectCourse create(UUID organizationId, UUID subjectId, UUID courseId, boolean primary) {
        return new AcademicSubjectCourse(
                UUID.randomUUID(),
                organizationId,
                subjectId,
                courseId,
                primary,
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}
