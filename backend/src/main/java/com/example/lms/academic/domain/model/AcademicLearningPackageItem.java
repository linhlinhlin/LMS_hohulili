package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.time.Instant;
import java.util.UUID;

public record AcademicLearningPackageItem(
        UUID id,
        UUID organizationId,
        UUID packageId,
        UUID subjectId,
        UUID courseId,
        Integer displayOrder,
        boolean required,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public static AcademicLearningPackageItem create(
            UUID organizationId,
            UUID packageId,
            UUID subjectId,
            UUID courseId,
            Integer displayOrder,
            Boolean required) {
        if (packageId == null) {
            throw new ValidationException("packageId", "packageId is required");
        }
        if ((subjectId == null && courseId == null) || (subjectId != null && courseId != null)) {
            throw new ValidationException("subjectId", "Select exactly one subject or course");
        }
        var safeDisplayOrder = displayOrder == null ? 0 : displayOrder;
        if (safeDisplayOrder < 0) {
            throw new ValidationException("displayOrder", "displayOrder must be non-negative");
        }
        return new AcademicLearningPackageItem(
                UUID.randomUUID(),
                organizationId,
                packageId,
                subjectId,
                courseId,
                safeDisplayOrder,
                required == null || required,
                "ACTIVE",
                Instant.now(),
                null
        );
    }
}
