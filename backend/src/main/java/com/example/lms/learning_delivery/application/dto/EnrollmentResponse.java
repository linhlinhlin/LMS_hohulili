package com.example.lms.learning_delivery.application.dto;

import com.example.lms.learning_delivery.domain.model.Enrollment;
import java.time.Instant;
import java.util.UUID;

/**
 * Response DTO for enrollment data.
 */
public record EnrollmentResponse(
    UUID id,
    UUID classId,
    UUID studentId,
    String status,
    Integer completionPercent,
    Instant enrolledAt,
    Instant completedAt,
    Instant lastAccessedAt
) {
    public static EnrollmentResponse from(Enrollment enrollment) {
        return new EnrollmentResponse(
            enrollment.getId(),
            enrollment.getClassId(),
            enrollment.getStudentId(),
            enrollment.getStatus() != null ? enrollment.getStatus().name() : null,
            enrollment.getCompletionPercent(),
            enrollment.getEnrolledAt(),
            enrollment.getCompletedAt(),
            enrollment.getLastAccessedAt()
        );
    }
}
