package com.example.lms.academic.domain.model;

import com.example.lms.shared.exception.ValidationException;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public record AcademicLearningPackageClassTarget(
        UUID id,
        UUID organizationId,
        UUID packageId,
        UUID courseId,
        UUID learningClassId,
        String status,
        Instant createdAt,
        Instant updatedAt
) {
    public AcademicLearningPackageClassTarget {
        Objects.requireNonNull(id, "id is required");
        Objects.requireNonNull(organizationId, "organizationId is required");
        Objects.requireNonNull(packageId, "packageId is required");
        Objects.requireNonNull(courseId, "courseId is required");
        Objects.requireNonNull(learningClassId, "learningClassId is required");
        status = AcademicStrings.status(status);
        if (!"ACTIVE".equals(status) && !"INACTIVE".equals(status)) {
            throw new ValidationException("status", "Trạng thái lớp đích không được hỗ trợ");
        }
    }

    public static AcademicLearningPackageClassTarget create(
            UUID organizationId,
            UUID packageId,
            UUID courseId,
            UUID learningClassId) {
        return new AcademicLearningPackageClassTarget(
                UUID.randomUUID(),
                organizationId,
                packageId,
                courseId,
                learningClassId,
                "ACTIVE",
                Instant.now(),
                null);
    }
}
