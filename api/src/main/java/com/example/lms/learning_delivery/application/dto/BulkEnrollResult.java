package com.example.lms.learning_delivery.application.dto;

import java.util.List;
import java.util.UUID;

/**
 * Result of bulk enrollment operation.
 */
public record BulkEnrollResult(
    int totalRequested,
    int successCount,
    int failedCount,
    List<EnrollmentResponse> successful,
    List<FailedEnrollment> failed
) {
    public record FailedEnrollment(
        UUID studentId,
        String reason
    ) {}
}
