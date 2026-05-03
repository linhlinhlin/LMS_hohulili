package com.example.lms.learning_delivery.application.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Read model for the "Quản lý học viên" drawer (class roster view).
 *
 * Pattern reference: Canvas People page, Coursera Roster — combines enrollment
 * fact (status, progress, dates) with denormalized student profile fields
 * (name, email) so the FE renders without a follow-up roundtrip per row.
 *
 * Distinct from {@link EnrollmentResponse} which is enrollment-domain-only and
 * shared across many controllers; this DTO exists for the roster surface and
 * may grow with UI-specific fields (avatar, last grade, certificate state)
 * without rippling into other consumers.
 */
public record ClassStudentResponse(
        UUID enrollmentId,
        UUID studentId,
        String studentName,
        String studentEmail,
        String status,
        Integer completionPercent,
        Instant enrolledAt,
        Instant lastAccessedAt
) {
    public static ClassStudentResponse of(
            UUID enrollmentId,
            UUID studentId,
            String studentName,
            String studentEmail,
            String status,
            Integer completionPercent,
            Instant enrolledAt,
            Instant lastAccessedAt
    ) {
        return new ClassStudentResponse(
                enrollmentId,
                studentId,
                studentName,
                studentEmail,
                status,
                completionPercent,
                enrolledAt,
                lastAccessedAt
        );
    }
}
